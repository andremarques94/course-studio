import { randomUUID } from "node:crypto";
import {
	type APIRequestContext,
	type Browser,
	type BrowserContext,
	expect,
	request,
	test,
} from "@playwright/test";
import { e2eEnvironment } from "./environment";
import {
	authenticate,
	CollaborationProcess,
	editor,
	openLesson,
	readMarkdown,
	replaceMarkdown,
	waitForMarkdown,
	waitForStatus,
} from "./helpers";

const collaboration = new CollaborationProcess();
const courseIds: string[] = [];
let api: APIRequestContext | undefined;

test.beforeAll(async () => {
	api = await request.newContext({
		baseURL: e2eEnvironment.urls.api,
		extraHTTPHeaders: { origin: e2eEnvironment.urls.web },
	});
	await authenticate(api);
	await collaboration.start();
});

test.afterAll(async () => {
	const cleanupErrors: unknown[] = [];
	try {
		await collaboration.stop();
	} catch (error) {
		cleanupErrors.push(error);
	}

	if (api) {
		const requestContext = api;
		const deleteResults = await Promise.allSettled(
			courseIds.map(async (courseId) => {
				const response = await requestContext.delete(
					`/api/courses/${courseId}`,
				);
				if (!response.ok()) {
					throw new Error(
						`Failed to delete test course ${courseId}: ${response.status()}`,
					);
				}
			}),
		);
		for (const result of deleteResults) {
			if (result.status === "rejected") {
				cleanupErrors.push(result.reason);
			}
		}
	}

	try {
		await api?.dispose();
	} catch (error) {
		cleanupErrors.push(error);
	}

	if (cleanupErrors.length > 0) {
		throw new AggregateError(cleanupErrors, "Multiplayer test cleanup failed");
	}
});

test("two clients exchange remote updates, edit concurrently, and converge after reload", async ({
	browser,
}) => {
	const lesson = await createLesson();
	const contexts = await createClients(browser);

	try {
		await Promise.all(
			contexts.pages.map((page) =>
				openLesson(page, lesson.courseId, lesson.lessonId),
			),
		);

		await replaceMarkdown(contexts.pages[0], "Shared center");
		await waitForMarkdown(contexts.pages[1], "Shared center");

		const firstEditor = editor(contexts.pages[0]);
		const secondEditor = editor(contexts.pages[1]);
		await Promise.all([
			(async () => {
				await firstEditor.press("ControlOrMeta+End");
				await contexts.pages[0].keyboard.insertText(" + alpha");
			})(),
			(async () => {
				await secondEditor.press("ControlOrMeta+Home");
				await contexts.pages[1].keyboard.insertText("bravo + ");
			})(),
		]);

		await expect
			.poll(async () => {
				const markdown = await Promise.all(contexts.pages.map(readMarkdown));
				return markdown[0] === markdown[1] ? markdown[0] : "not converged";
			})
			.toBe("bravo + Shared center + alpha");

		await contexts.pages[1].reload();
		await waitForStatus(contexts.pages[1], "synced");
		await waitForMarkdown(contexts.pages[1], "bravo + Shared center + alpha");
	} finally {
		await closeContexts(contexts.contexts);
	}
});

test("connected clients recover after the collaboration server restarts", async ({
	browser,
}) => {
	const lesson = await createLesson();
	const contexts = await createClients(browser);

	try {
		await Promise.all(
			contexts.pages.map((page) =>
				openLesson(page, lesson.courseId, lesson.lessonId),
			),
		);
		await collaboration.stop();
		await Promise.all(
			contexts.pages.map((page) => waitForStatus(page, "offline")),
		);

		await collaboration.start();
		await Promise.all(
			contexts.pages.map((page) => waitForStatus(page, "synced")),
		);

		await replaceMarkdown(contexts.pages[0], "Reconnected update");
		await waitForMarkdown(contexts.pages[1], "Reconnected update");
	} finally {
		await closeContexts(contexts.contexts);
	}
});

test("a fresh client restores the persisted document after a server restart", async ({
	browser,
}) => {
	const lesson = await createLesson();
	const initialClients = await createClients(browser);
	const persistedMarkdown = `Persisted ${randomUUID()}`;

	try {
		await Promise.all(
			initialClients.pages.map((page) =>
				openLesson(page, lesson.courseId, lesson.lessonId),
			),
		);
		await replaceMarkdown(initialClients.pages[0], persistedMarkdown);
		await waitForMarkdown(initialClients.pages[1], persistedMarkdown);
		await Promise.all(
			initialClients.pages.map((page) => waitForStatus(page, "synced")),
		);
	} finally {
		await closeContexts(initialClients.contexts);
	}

	await collaboration.stop();
	await collaboration.start();

	const restoredContext = await browser.newContext();
	try {
		await authenticate(restoredContext.request);
		const restoredPage = await restoredContext.newPage();
		await openLesson(restoredPage, lesson.courseId, lesson.lessonId);
		await waitForMarkdown(restoredPage, persistedMarkdown);
	} finally {
		await restoredContext.close();
	}
});

async function createLesson() {
	if (!api) {
		throw new Error("API request context is not initialized");
	}

	const courseResponse = await api.post("/api/courses", {
		data: { title: `Playwright ${randomUUID()}` },
	});
	expect(courseResponse.ok()).toBe(true);
	const courseId = getId(await courseResponse.json());
	courseIds.push(courseId);

	const lessonResponse = await api.post(`/api/courses/${courseId}/lessons`, {
		data: { title: "Multiplayer lesson" },
	});
	expect(lessonResponse.ok()).toBe(true);

	return { courseId, lessonId: getId(await lessonResponse.json()) };
}

async function createClients(browser: Browser) {
	const contexts = await Promise.all([
		browser.newContext(),
		browser.newContext(),
	]);
	await Promise.all(contexts.map((context) => authenticate(context.request)));
	const pages = await Promise.all(contexts.map((context) => context.newPage()));
	return { contexts, pages };
}

async function closeContexts(contexts: BrowserContext[]) {
	await Promise.all(contexts.map((context) => context.close()));
}

function getId(value: unknown) {
	if (
		typeof value !== "object" ||
		value === null ||
		!("id" in value) ||
		typeof value.id !== "string"
	) {
		throw new Error("Expected an API response with a string id");
	}
	return value.id;
}
