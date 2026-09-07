import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import type { CourseAccess } from "@course-studio/auth/authorization";
import { HocuspocusProvider } from "@hocuspocus/provider";
import pino from "pino";
import * as Y from "yjs";
import { createLessonAuthorizer } from "../src/auth/lesson-authorization.js";
import { createCollaborationServer } from "../src/server/create-collaboration-server.js";

const lessonId = "550e8400-e29b-41d4-a716-446655440000";
const secondLessonId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

function waitForProviderEvent(
	provider: HocuspocusProvider,
	event: "authenticationFailed" | "close" | "synced",
) {
	return new Promise<void>((resolve, reject) => {
		const handler = () => {
			clearTimeout(timeout);
			provider.off(event, handler);
			resolve();
		};
		const timeout = setTimeout(() => {
			provider.off(event, handler);
			reject(new Error(`Timed out waiting for provider ${event}.`));
		}, 5_000);
		provider.on(event, handler);
	});
}

function waitFor(predicate: () => boolean, message: string) {
	return new Promise<void>((resolve, reject) => {
		const deadline = Date.now() + 5_000;
		const poll = () => {
			if (predicate()) {
				resolve();
				return;
			}
			if (Date.now() >= deadline) {
				reject(new Error(message));
				return;
			}
			setTimeout(poll, 10);
		};
		poll();
	});
}

test("lesson authorizer applies the shared lesson edit role matrix", async () => {
	const accessByUser: Record<string, CourseAccess | undefined> = {
		owner: { ownerId: "owner" },
		editor: { ownerId: "owner", membershipRole: "editor" },
		viewer: { ownerId: "owner", membershipRole: "viewer" },
		outsider: { ownerId: "owner", membershipRole: null },
		missing: undefined,
	};
	const authorizeLesson = createLessonAuthorizer(async (userId, id) => {
		assert.equal(id, lessonId);
		return accessByUser[userId];
	});

	assert.equal(await authorizeLesson("owner", lessonId), true);
	assert.equal(await authorizeLesson("editor", lessonId), true);
	assert.equal(await authorizeLesson("viewer", lessonId), false);
	assert.equal(await authorizeLesson("outsider", lessonId), false);
	assert.equal(await authorizeLesson("missing", lessonId), false);
});

test("Hocuspocus hooks authorize only the guarded JWT subject and strict room", async () => {
	const authorized: Array<[string, string]> = [];
	const server = createCollaborationServer({
		host: "127.0.0.1",
		port: 3002,
		logger: pino({ level: "silent" }),
		authenticateToken: async (token) => ({ userId: token }),
		authorizeLesson: async (userId, id) => {
			authorized.push([userId, id]);
			return userId === "owner" || userId === "editor";
		},
		loadDocument: async ({ document }) => document,
		storeDocument: async () => undefined,
	});
	const authenticate = server.hocuspocus.configuration.onAuthenticate;
	assert.ok(authenticate);

	assert.deepEqual(
		await authenticate({
			documentName: `lesson:${lessonId}`,
			token: "owner",
		} as never),
		{ userId: "owner" },
	);
	assert.deepEqual(authorized, [["owner", lessonId]]);

	await assert.rejects(
		authenticate({
			documentName: `lesson:${lessonId}`,
			token: "other",
		} as never),
		/Lesson not found/,
	);
	await assert.rejects(
		authenticate({ documentName: "course:unsafe", token: "owner" } as never),
	);
	await assert.rejects(
		authenticate({ documentName: `lesson:${lessonId}`, token: "" } as never),
		/Authentication token is required/,
	);
});

test("a malformed authentication context is rejected before authorization", async () => {
	const server = createCollaborationServer({
		host: "127.0.0.1",
		port: 0,
		logger: pino({ level: "silent" }),
		// Simulates a misbehaving token backend resolving without a userId.
		authenticateToken: async () => ({}) as never,
		authorizeLesson: async () => true,
		loadDocument: async ({ document }) => document,
		storeDocument: async () => undefined,
	});
	const authenticate = server.hocuspocus.configuration.onAuthenticate;
	assert.ok(authenticate);

	await assert.rejects(
		authenticate({
			documentName: `lesson:${lessonId}`,
			token: "owner",
		} as never),
		/missing a userId/,
	);
	await server.destroy();
});

test("owner and editor connect while viewer and outsider fail before document load", async () => {
	const loadedDocuments: string[] = [];
	const server = createCollaborationServer({
		host: "127.0.0.1",
		port: 0,
		logger: pino({ level: "silent" }),
		authenticateToken: async (token) => ({ userId: token }),
		authorizeLesson: async (userId) =>
			userId === "owner" || userId === "editor",
		loadDocument: async ({ document, documentName }) => {
			loadedDocuments.push(documentName);
			return document;
		},
		storeDocument: async () => undefined,
	});
	await server.listen();
	const address = server.httpServer.address() as AddressInfo;
	const url = `ws://127.0.0.1:${address.port}`;
	const providers: HocuspocusProvider[] = [];
	const documents: Y.Doc[] = [];
	const connect = (userId: string, id: string) => {
		const document = new Y.Doc();
		const provider = new HocuspocusProvider({
			url,
			name: `lesson:${id}`,
			token: userId,
			document,
		});
		providers.push(provider);
		documents.push(document);
		return provider;
	};

	try {
		const owner = connect("owner", lessonId);
		await waitForProviderEvent(owner, "synced");
		const editor = connect("editor", lessonId);
		await waitForProviderEvent(editor, "synced");

		const viewer = connect("viewer", secondLessonId);
		await waitForProviderEvent(viewer, "authenticationFailed");
		const outsider = connect("outsider", secondLessonId);
		await waitForProviderEvent(outsider, "authenticationFailed");

		assert.deepEqual(loadedDocuments, [`lesson:${lessonId}`]);
	} finally {
		for (const provider of providers) {
			provider.destroy();
		}
		for (const document of documents) {
			document.destroy();
		}
		await server.destroy();
	}
});

test("every inbound message is reauthorized before updates are accepted", async () => {
	const access = new Map([
		["owner", true],
		["editor", true],
	]);
	const authorizationChecks = new Map<string, number>();
	let storedMarkdown = "";
	const server = createCollaborationServer({
		host: "127.0.0.1",
		port: 0,
		logger: pino({ level: "silent" }),
		authenticateToken: async (token) => ({ userId: token }),
		authorizeLesson: async (userId) => {
			authorizationChecks.set(
				userId,
				(authorizationChecks.get(userId) ?? 0) + 1,
			);
			return access.get(userId) ?? false;
		},
		loadDocument: async ({ document }) => document,
		storeDocument: async ({ document }) => {
			storedMarkdown = document.getText("markdown").toString();
		},
	});
	await server.listen();
	const address = server.httpServer.address() as AddressInfo;
	const url = `ws://127.0.0.1:${address.port}`;
	const ownerDocument = new Y.Doc();
	const editorDocument = new Y.Doc();
	const owner = new HocuspocusProvider({
		url,
		name: `lesson:${lessonId}`,
		token: "owner",
		document: ownerDocument,
	});
	const editor = new HocuspocusProvider({
		url,
		name: `lesson:${lessonId}`,
		token: "editor",
		document: editorDocument,
	});

	try {
		await Promise.all([
			waitForProviderEvent(owner, "synced"),
			waitForProviderEvent(editor, "synced"),
		]);
		const editorChecksAfterConnect = authorizationChecks.get("editor") ?? 0;

		const validUpdateReceived = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error("Timed out waiting for the valid update.")),
				5_000,
			);
			const observe = () => {
				if (editorDocument.getText("markdown").toString() === "accepted") {
					clearTimeout(timeout);
					editorDocument.getText("markdown").unobserve(observe);
					resolve();
				}
			};
			editorDocument.getText("markdown").observe(observe);
		});
		ownerDocument.getText("markdown").insert(0, "accepted");
		await validUpdateReceived;

		access.set("editor", false);
		const closed = waitForProviderEvent(editor, "close");
		editorDocument.getText("markdown").insert(8, "-rejected");
		await closed;

		assert.ok(
			(authorizationChecks.get("editor") ?? 0) > editorChecksAfterConnect,
		);
		assert.equal(ownerDocument.getText("markdown").toString(), "accepted");
		assert.equal(
			server.hocuspocus.documents
				.get(`lesson:${lessonId}`)
				?.getText("markdown")
				.toString(),
			"accepted",
		);

		server.hocuspocus.flushPendingStores();
		await waitFor(
			() => storedMarkdown.length > 0,
			"Timed out waiting for document persistence.",
		);
		assert.equal(storedMarkdown, "accepted");
	} finally {
		owner.destroy();
		editor.destroy();
		ownerDocument.destroy();
		editorDocument.destroy();
		await server.destroy();
	}
});
