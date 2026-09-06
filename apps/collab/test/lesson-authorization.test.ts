import { strict as assert } from "node:assert";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { HocuspocusProvider } from "@hocuspocus/provider";
import pino from "pino";
import * as Y from "yjs";
import { createLessonAuthorizer } from "../src/auth/lesson-authorization.js";
import { createCollaborationServer } from "../src/server/create-collaboration-server.js";

const lessonId = "550e8400-e29b-41d4-a716-446655440000";

test("lesson authorizer grants only the course owner", async () => {
	const authorizeLesson = createLessonAuthorizer(async (id) => {
		assert.equal(id, lessonId);
		return "owner";
	});

	assert.equal(await authorizeLesson("owner", lessonId), true);
	assert.equal(await authorizeLesson("other", lessonId), false);
});

test("lesson authorizer rejects missing lessons", async () => {
	assert.equal(
		await createLessonAuthorizer(async () => undefined)("owner", lessonId),
		false,
	);
});

test("Hocuspocus authentication hook authorizes the JWT subject and room", async () => {
	const authorized: Array<[string, string]> = [];
	const server = createCollaborationServer({
		host: "127.0.0.1",
		port: 3002,
		logger: pino({ level: "silent" }),
		authenticateToken: async (token) => ({ userId: token }),
		authorizeLesson: async (userId, id) => {
			authorized.push([userId, id]);
			return userId === "owner";
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

test("a non-owner WebSocket is rejected before its document loads", async () => {
	let loadCount = 0;
	const server = createCollaborationServer({
		host: "127.0.0.1",
		port: 0,
		logger: pino({ level: "silent" }),
		authenticateToken: async (token) => ({ userId: token }),
		authorizeLesson: async (userId) => userId === "owner",
		loadDocument: async ({ document }) => {
			loadCount += 1;
			return document;
		},
		storeDocument: async () => undefined,
	});
	await server.listen();
	const address = server.httpServer.address() as AddressInfo;
	const url = `ws://127.0.0.1:${address.port}`;
	const unauthorizedDocument = new Y.Doc();
	const unauthorized = new HocuspocusProvider({
		url,
		name: `lesson:${lessonId}`,
		token: "other",
		document: unauthorizedDocument,
	});

	try {
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() =>
					reject(new Error("Timed out waiting for authorization rejection.")),
				5_000,
			);
			unauthorized.on("authenticationFailed", () => {
				clearTimeout(timeout);
				resolve();
			});
		});
		assert.equal(loadCount, 0);
	} finally {
		unauthorized.destroy();
		unauthorizedDocument.destroy();
		await server.destroy();
	}
});
