import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createAuth } from "@course-studio/auth";
import { createDatabase } from "@course-studio/db";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/infrastructure/logger.js";

const databaseUrl = process.env.DATABASE_URL;
const logger = createLogger("silent");
const authSecret =
	process.env.BETTER_AUTH_SECRET ??
	"integration-test-secret-with-32-characters";
const webOrigin = "http://localhost:3000";

function createTestApp(db: ReturnType<typeof createDatabase>) {
	const auth = createAuth(db, {
		baseURL: "http://localhost:3001",
		secret: authSecret,
		trustedOrigins: [webOrigin],
	});
	return createApp(db, { auth, corsOrigins: [webOrigin], logger });
}

function withSession(app: ReturnType<typeof createTestApp>, cookie: string) {
	return {
		request(input: string, init?: RequestInit) {
			const headers = new Headers(init?.headers);
			headers.set("cookie", cookie);
			return app.request(input, { ...init, headers });
		},
	} as ReturnType<typeof createTestApp>;
}

test("courses and lessons persist through the API", {
	skip: databaseUrl ? false : "DATABASE_URL is not set",
}, async () => {
	if (!databaseUrl) {
		return;
	}

	let db = createDatabase(databaseUrl);
	let app = createTestApp(db);
	let courseId: string | undefined;

	try {
		const healthResponse = await app.request("/api/health");
		assert.equal(healthResponse.status, 200);
		assert.deepEqual(await healthResponse.json(), { status: "ok" });

		const dbHealthResponse = await app.request("/api/health/db");
		assert.equal(dbHealthResponse.status, 200);
		assert.ok(dbHealthResponse.headers.get("x-request-id"));
		assert.equal((await app.request("/health")).status, 404);
		assert.equal((await app.request("/courses")).status, 404);
		assert.equal((await app.request("/auth/get-session")).status, 404);

		const corsResponse = await app.request("/api/courses", {
			headers: { origin: webOrigin },
		});
		assert.equal(
			corsResponse.headers.get("access-control-allow-origin"),
			webOrigin,
		);
		assert.equal(
			corsResponse.headers.get("access-control-allow-credentials"),
			"true",
		);

		const localApp = createTestApp(db);
		const localCorsResponse = await localApp.request("/api/health", {
			headers: { origin: webOrigin },
		});
		assert.equal(
			localCorsResponse.headers.get("access-control-allow-origin"),
			webOrigin,
		);

		assert.equal((await app.request("/api/courses")).status, 401);
		const signUpResponse = await app.request("/api/auth/sign-up/email", {
			method: "POST",
			headers: { "content-type": "application/json", origin: webOrigin },
			body: JSON.stringify({
				email: `integration-${randomUUID()}@example.com`,
				name: "Integration User",
				password: "test-password",
			}),
		});
		assert.equal(signUpResponse.status, 200);
		const cookie = signUpResponse.headers.get("set-cookie")?.split(";", 1)[0];
		assert.ok(cookie);
		app = withSession(app, cookie);
		const sessionResponse = await app.request("/api/auth/get-session");
		assert.equal(sessionResponse.status, 200);
		assert.equal(
			((await sessionResponse.json()) as { user: { name: string } }).user.name,
			"Integration User",
		);
		const tokenResponse = await app.request("/api/auth/token");
		assert.equal(tokenResponse.status, 200);
		assert.match(
			((await tokenResponse.json()) as { token: string }).token,
			/^[\w-]+\.[\w-]+\.[\w-]+$/,
		);

		const invalidCourseResponse = await app.request("/api/courses", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title: "" }),
		});
		assert.equal(invalidCourseResponse.status, 400);

		const title = `Persistence ${randomUUID()}`;
		const createCourseResponse = await app.request("/api/courses", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title }),
		});
		assert.equal(createCourseResponse.status, 201);
		const course = (await createCourseResponse.json()) as {
			id: string;
			slug: string;
			title: string;
		};
		courseId = course.id;
		const coursesResponse = await app.request("/api/courses");
		assert.equal(coursesResponse.status, 200);
		const courseList = (await coursesResponse.json()) as Array<{ id: string }>;
		assert.equal(
			courseList.some((item) => item.id === courseId),
			true,
		);

		const duplicateCourseResponse = await app.request("/api/courses", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title }),
		});
		assert.equal(duplicateCourseResponse.status, 409);

		const updateCourseResponse = await app.request(`/api/courses/${courseId}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title: `${title} updated` }),
		});
		assert.equal(updateCourseResponse.status, 200);
		const updatedCourse = (await updateCourseResponse.json()) as {
			slug: string;
			title: string;
		};
		assert.equal(updatedCourse.slug, course.slug);

		const lessonTitle = "Introduction";
		const createLessonResponse = await app.request(
			`/api/courses/${courseId}/lessons`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ title: lessonTitle }),
			},
		);
		assert.equal(createLessonResponse.status, 201);
		const lesson = (await createLessonResponse.json()) as {
			id: string;
			slug: string;
		};
		const lessonsResponse = await app.request(
			`/api/courses/${courseId}/lessons`,
		);
		assert.equal(lessonsResponse.status, 200);
		const lessonList = (await lessonsResponse.json()) as Array<{ id: string }>;
		assert.equal(
			lessonList.some((item) => item.id === lesson.id),
			true,
		);

		const duplicateLessonResponse = await app.request(
			`/api/courses/${courseId}/lessons`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ title: lessonTitle }),
			},
		);
		assert.equal(duplicateLessonResponse.status, 409);

		const initialMarkdown = `# ${lessonTitle}`;
		const markdownUpdateResponse = await app.request(
			`/api/lessons/${lesson.id}`,
			{
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ markdown: "# Must use Yjs" }),
			},
		);
		assert.equal(markdownUpdateResponse.status, 400);

		const updateLessonResponse = await app.request(
			`/api/lessons/${lesson.id}`,
			{
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					title: "Updated introduction",
					themeId: "academic",
				}),
			},
		);
		assert.equal(updateLessonResponse.status, 200);
		const updatedLesson = (await updateLessonResponse.json()) as {
			slug: string;
			title: string;
		};
		assert.equal(updatedLesson.title, "Updated introduction");
		assert.equal(updatedLesson.slug, lesson.slug);

		const secondLessonResponse = await app.request(
			`/api/courses/${courseId}/lessons`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ title: "Second lesson" }),
			},
		);
		assert.equal(secondLessonResponse.status, 201);
		const secondLesson = (await secondLessonResponse.json()) as { id: string };
		const incompleteOrderResponse = await app.request(
			`/api/courses/${courseId}/lessons/order`,
			{
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ lessonIds: [lesson.id] }),
			},
		);
		assert.equal(incompleteOrderResponse.status, 400);

		const reorderResponse = await app.request(
			`/api/courses/${courseId}/lessons/order`,
			{
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ lessonIds: [secondLesson.id, lesson.id] }),
			},
		);
		assert.equal(reorderResponse.status, 200);
		const reorderedLessons = (await reorderResponse.json()) as Array<{
			id: string;
			position: number;
		}>;
		assert.deepEqual(
			reorderedLessons.map(({ id, position }) => ({ id, position })),
			[
				{ id: secondLesson.id, position: 0 },
				{ id: lesson.id, position: 1 },
			],
		);

		await db.$client.end();
		db = createDatabase(databaseUrl);
		app = withSession(createTestApp(db), cookie);

		const persistedLessonResponse = await app.request(
			`/api/lessons/${lesson.id}`,
		);
		assert.equal(persistedLessonResponse.status, 200);
		const persistedLesson = (await persistedLessonResponse.json()) as {
			markdown: string;
			themeId: string;
		};
		assert.equal(persistedLesson.markdown, initialMarkdown);
		assert.equal(persistedLesson.themeId, "academic");
		const persistedOrderResponse = await app.request(
			`/api/courses/${courseId}/lessons`,
		);
		const persistedOrder = (await persistedOrderResponse.json()) as Array<{
			id: string;
		}>;
		assert.deepEqual(
			persistedOrder.map(({ id }) => id),
			[secondLesson.id, lesson.id],
		);

		const deleteLessonResponse = await app.request(
			`/api/lessons/${lesson.id}`,
			{
				method: "DELETE",
			},
		);
		assert.equal(deleteLessonResponse.status, 204);

		const deleteCourseResponse = await app.request(`/api/courses/${courseId}`, {
			method: "DELETE",
		});
		assert.equal(deleteCourseResponse.status, 204);
		courseId = undefined;

		const cascadeResponse = await app.request(
			`/api/lessons/${secondLesson.id}`,
		);
		assert.equal(cascadeResponse.status, 404);

		const missingCourseResponse = await app.request(
			`/api/courses/${randomUUID()}`,
		);
		assert.equal(missingCourseResponse.status, 404);

		assert.equal(
			(
				await app.request("/api/auth/sign-out", {
					method: "POST",
					headers: { origin: webOrigin },
				})
			).status,
			200,
		);
	} finally {
		if (courseId) {
			await app.request(`/api/courses/${courseId}`, { method: "DELETE" });
		}
		await db.$client.end();
	}
});
