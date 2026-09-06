import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createAuth } from "@course-studio/auth";
import { createDatabase } from "@course-studio/db";
import { Hono } from "hono";
import { createApp } from "#api/app";
import type { AppEnv } from "#api/http/context";
import { createLogger } from "#api/logger";
import { createPrivateRoutes } from "#api/private-routes";

const databaseUrl = process.env.DATABASE_URL;
const logger = createLogger("silent");
const authSecret =
	process.env.BETTER_AUTH_SECRET ??
	"integration-test-secret-with-32-characters";
const verificationLinks = new Map<string, string>();
const webOrigin = "http://localhost:3000";

function createTestApp(
	db: ReturnType<typeof createDatabase>,
	baseURL = "http://localhost:3001",
) {
	const auth = createAuth(db, {
		baseURL,
		secret: authSecret,
		trustedOrigins: [webOrigin],
		sendVerificationEmail: async ({ user, url }) => {
			verificationLinks.set(user.email, url);
		},
	});
	return createApp(db, {
		auth,
		corsOrigins: [webOrigin],
		logger,
		webOrigin,
		sendCourseInvitation: async () => undefined,
	});
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
		const alternateAuth = createAuth(db, {
			baseURL: "http://localhost:3001",
			secret: authSecret,
			trustedOrigins: [webOrigin],
		});
		const alternateMount = new Hono<AppEnv>().route(
			"/private",
			createPrivateRoutes(db, {
				auth: alternateAuth,
				trustedOrigins: [webOrigin],
				webOrigin,
				sendCourseInvitation: async () => undefined,
			}),
		);
		assert.equal(
			(await alternateMount.request("/private/courses")).status,
			401,
		);

		const healthResponse = await app.request("/api/health");
		assert.equal(healthResponse.status, 200);
		assert.deepEqual(await healthResponse.json(), { status: "ok" });

		const dbHealthResponse = await app.request("/api/health/db");
		assert.equal(dbHealthResponse.status, 200);
		assert.ok(dbHealthResponse.headers.get("x-request-id"));
		assert.equal((await app.request("/health")).status, 404);
		assert.equal((await app.request("/courses")).status, 404);
		assert.equal((await app.request("/auth/get-session")).status, 404);
		assert.equal((await app.request("/api/unknown")).status, 404);
		assert.equal(
			(
				await app.request("/api/unknown", {
					method: "POST",
					headers: { origin: "https://untrusted.example" },
				})
			).status,
			404,
		);

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
		const signUpResponse = await createVerifiedAccount(app, {
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
		const sessionCookie = signUpResponse.headers.get("set-cookie");
		assert.ok(sessionCookie);
		assert.match(sessionCookie, /; HttpOnly/i);
		assert.match(sessionCookie, /; SameSite=Lax/i);
		assert.match(sessionCookie, /; Path=\//i);
		assert.match(sessionCookie, /; Max-Age=\d+/i);
		app = withSession(app, cookie);
		const sessionResponse = await app.request("/api/auth/get-session");
		assert.equal(sessionResponse.status, 200);
		const session = (await sessionResponse.json()) as {
			user: { id: string; name: string };
		};
		assert.equal(session.user.name, "Integration User");
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
			ownerId: string;
			slug: string;
			title: string;
		};
		courseId = course.id;
		assert.equal(course.ownerId, session.user.id);
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

		const untrustedOriginResponse = await app.request(
			`/api/lessons/${lesson.id}`,
			{
				method: "PATCH",
				headers: {
					"content-type": "application/json",
					origin: "https://evil.example",
				},
				body: JSON.stringify({ title: "Cross-site mutation" }),
			},
		);
		assert.equal(untrustedOriginResponse.status, 403);
		assert.equal(
			((await untrustedOriginResponse.json()) as { error: { code: string } })
				.error.code,
			"UNTRUSTED_ORIGIN",
		);

		const bobSignUpResponse = await createVerifiedAccount(createTestApp(db), {
			method: "POST",
			headers: { "content-type": "application/json", origin: webOrigin },
			body: JSON.stringify({
				email: `integration-bob-${randomUUID()}@example.com`,
				name: "Integration Bob",
				password: "test-password",
			}),
		});
		assert.equal(bobSignUpResponse.status, 200);
		const bobCookie = bobSignUpResponse.headers
			.get("set-cookie")
			?.split(";", 1)[0];
		assert.ok(bobCookie);
		const bobApp = withSession(createTestApp(db), bobCookie);
		const bobCourseResponse = await bobApp.request("/api/courses", {
			method: "POST",
			headers: { "content-type": "application/json", origin: webOrigin },
			body: JSON.stringify({ title }),
		});
		assert.equal(bobCourseResponse.status, 201);
		const bobCourse = (await bobCourseResponse.json()) as {
			id: string;
			slug: string;
		};
		assert.equal(bobCourse.slug, course.slug);

		const bobCourses = (await (
			await bobApp.request("/api/courses")
		).json()) as Array<{ id: string }>;
		assert.equal(
			bobCourses.some(({ id }) => id === courseId),
			false,
		);

		const hostileRequests: Array<[string, RequestInit | undefined]> = [
			[`/api/courses/${courseId}`, undefined],
			[
				`/api/courses/${courseId}`,
				{
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ title: "Taken over" }),
				},
			],
			[`/api/courses/${courseId}`, { method: "DELETE" }],
			[`/api/courses/${courseId}/lessons`, undefined],
			[
				`/api/courses/${courseId}/lessons`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ title: "Unauthorized lesson" }),
				},
			],
			[`/api/lessons/${lesson.id}`, undefined],
			[
				`/api/lessons/${lesson.id}`,
				{
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ title: "Taken over" }),
				},
			],
			[`/api/lessons/${lesson.id}`, { method: "DELETE" }],
		];
		for (const [path, init] of hostileRequests) {
			assert.equal((await bobApp.request(path, init)).status, 404);
		}
		assert.equal(
			(
				await bobApp.request(`/api/courses/${courseId}/lessons/order`, {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ lessonIds: [lesson.id, secondLesson.id] }),
				})
			).status,
			404,
		);
		assert.equal(
			(
				await bobApp.request(`/api/courses/${bobCourse.id}`, {
					method: "DELETE",
				})
			).status,
			204,
		);

		const secureSignUpResponse = await createVerifiedAccount(
			createTestApp(db, "https://api.example.test"),
			{
				method: "POST",
				headers: { "content-type": "application/json", origin: webOrigin },
				body: JSON.stringify({
					email: `integration-secure-${randomUUID()}@example.com`,
					name: "Secure Cookie User",
					password: "test-password",
				}),
			},
		);
		assert.equal(secureSignUpResponse.status, 200);
		assert.match(
			secureSignUpResponse.headers.get("set-cookie") ?? "",
			/; Secure/i,
		);
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

async function createVerifiedAccount(
	app: ReturnType<typeof createTestApp>,
	init: RequestInit,
) {
	const credentials = JSON.parse(String(init.body)) as {
		email: string;
		password: string;
	};
	const signup = await app.request("/api/auth/sign-up/email", init);
	assert.equal(signup.status, 200);
	assert.equal(signup.headers.get("set-cookie"), null);
	const blocked = await app.request("/api/auth/sign-in/email", init);
	assert.equal(blocked.status, 403);
	const url = verificationLinks.get(credentials.email);
	assert.ok(url);
	const verified = await app.request(url);
	assert.ok(verified.status < 400);
	return app.request("/api/auth/sign-in/email", init);
}
