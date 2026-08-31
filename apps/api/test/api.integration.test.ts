import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createDatabase } from "@course-studio/db";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/infrastructure/logger.js";

const databaseUrl = process.env.DATABASE_URL;
const logger = createLogger("silent");

test("courses and lessons persist through the API", {
	skip: databaseUrl ? false : "DATABASE_URL is not set",
}, async () => {
	if (!databaseUrl) {
		return;
	}

	let db = createDatabase(databaseUrl);
	let app = createApp(db, {
		corsOrigins: ["http://localhost:3000"],
		logger,
	});
	let courseId: string | undefined;

	try {
		const healthResponse = await app.request("/health");
		assert.equal(healthResponse.status, 200);
		assert.deepEqual(await healthResponse.json(), { status: "ok" });

		const dbHealthResponse = await app.request("/health/db");
		assert.equal(dbHealthResponse.status, 200);
		assert.ok(dbHealthResponse.headers.get("x-request-id"));

		const corsResponse = await app.request("/courses", {
			headers: { origin: "http://localhost:3000" },
		});
		assert.equal(
			corsResponse.headers.get("access-control-allow-origin"),
			"http://localhost:3000",
		);

		const localApp = createApp(db, { corsOrigins: ["*"], logger });
		const localCorsResponse = await localApp.request("/health", {
			headers: { origin: "http://localhost:4173" },
		});
		assert.equal(
			localCorsResponse.headers.get("access-control-allow-origin"),
			"*",
		);

		const invalidCourseResponse = await app.request("/courses", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title: "" }),
		});
		assert.equal(invalidCourseResponse.status, 400);

		const title = `Persistence ${randomUUID()}`;
		const createCourseResponse = await app.request("/courses", {
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
		const coursesResponse = await app.request("/courses");
		assert.equal(coursesResponse.status, 200);
		const courseList = (await coursesResponse.json()) as Array<{ id: string }>;
		assert.equal(
			courseList.some((item) => item.id === courseId),
			true,
		);

		const duplicateCourseResponse = await app.request("/courses", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title }),
		});
		assert.equal(duplicateCourseResponse.status, 409);

		const updateCourseResponse = await app.request(`/courses/${courseId}`, {
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
			`/courses/${courseId}/lessons`,
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
		const lessonsResponse = await app.request(`/courses/${courseId}/lessons`);
		assert.equal(lessonsResponse.status, 200);
		const lessonList = (await lessonsResponse.json()) as Array<{ id: string }>;
		assert.equal(
			lessonList.some((item) => item.id === lesson.id),
			true,
		);

		const duplicateLessonResponse = await app.request(
			`/courses/${courseId}/lessons`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ title: lessonTitle }),
			},
		);
		assert.equal(duplicateLessonResponse.status, 409);

		const markdown = "# Persisted\n\nThis survives a restart.";
		const updateLessonResponse = await app.request(`/lessons/${lesson.id}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				title: "Updated introduction",
				markdown,
				themeId: "academic",
			}),
		});
		assert.equal(updateLessonResponse.status, 200);
		const updatedLesson = (await updateLessonResponse.json()) as {
			slug: string;
			title: string;
		};
		assert.equal(updatedLesson.title, "Updated introduction");
		assert.equal(updatedLesson.slug, lesson.slug);

		const secondLessonResponse = await app.request(
			`/courses/${courseId}/lessons`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ title: "Second lesson" }),
			},
		);
		assert.equal(secondLessonResponse.status, 201);
		const secondLesson = (await secondLessonResponse.json()) as { id: string };
		const incompleteOrderResponse = await app.request(
			`/courses/${courseId}/lessons/order`,
			{
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ lessonIds: [lesson.id] }),
			},
		);
		assert.equal(incompleteOrderResponse.status, 400);

		const reorderResponse = await app.request(
			`/courses/${courseId}/lessons/order`,
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
		app = createApp(db, {
			corsOrigins: ["http://localhost:3000"],
			logger,
		});

		const persistedLessonResponse = await app.request(`/lessons/${lesson.id}`);
		assert.equal(persistedLessonResponse.status, 200);
		const persistedLesson = (await persistedLessonResponse.json()) as {
			markdown: string;
			themeId: string;
		};
		assert.equal(persistedLesson.markdown, markdown);
		assert.equal(persistedLesson.themeId, "academic");
		const persistedOrderResponse = await app.request(
			`/courses/${courseId}/lessons`,
		);
		const persistedOrder = (await persistedOrderResponse.json()) as Array<{
			id: string;
		}>;
		assert.deepEqual(
			persistedOrder.map(({ id }) => id),
			[secondLesson.id, lesson.id],
		);

		const deleteLessonResponse = await app.request(`/lessons/${lesson.id}`, {
			method: "DELETE",
		});
		assert.equal(deleteLessonResponse.status, 204);

		const deleteCourseResponse = await app.request(`/courses/${courseId}`, {
			method: "DELETE",
		});
		assert.equal(deleteCourseResponse.status, 204);
		courseId = undefined;

		const cascadeResponse = await app.request(`/lessons/${secondLesson.id}`);
		assert.equal(cascadeResponse.status, 404);

		const missingCourseResponse = await app.request(`/courses/${randomUUID()}`);
		assert.equal(missingCourseResponse.status, 404);
	} finally {
		if (courseId) {
			await app.request(`/courses/${courseId}`, { method: "DELETE" });
		}
		await db.$client.end();
	}
});
