import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { courses, createDatabase, lessons } from "@course-studio/db";
import { eq } from "drizzle-orm";
import * as Y from "yjs";
import { createLessonDocumentLoader } from "../src/documents/lesson-document-loader.js";
import {
	createLessonDocumentPersistence,
	createPostgresLessonDocumentStore,
} from "../src/documents/lesson-document-persistence.js";

const databaseUrl = process.env.DATABASE_URL;

test("migrates a legacy lesson once and restores it after recreating the database client", {
	skip: databaseUrl ? false : "DATABASE_URL is not set",
}, async () => {
	if (!databaseUrl) {
		return;
	}

	let db = createDatabase(databaseUrl);
	const courseId = randomUUID();
	const lessonId = randomUUID();
	const documentName = `lesson:${lessonId}`;

	try {
		await db.insert(courses).values({
			id: courseId,
			title: "Collaboration persistence",
			slug: `collaboration-persistence-${courseId}`,
		});
		await db.insert(lessons).values({
			id: lessonId,
			courseId,
			title: "Persisted lesson",
			slug: "persisted-lesson",
			markdown: "# PostgreSQL\n\nExact collaborative state.",
			themeId: "dark",
		});

		let lessonLoadCount = 0;
		const initializeDocument = createLessonDocumentLoader({
			findLesson: async (id) => {
				lessonLoadCount += 1;
				assert.equal(id, lessonId);
				return {
					markdown: "# PostgreSQL\n\nExact collaborative state.",
					themeId: "dark",
				};
			},
		});
		const firstDocument = new Y.Doc();
		const firstStore = createPostgresLessonDocumentStore(db);
		const firstPersistence = createLessonDocumentPersistence({
			store: firstStore,
			initializeDocument,
		});
		await firstPersistence.load({
			document: firstDocument,
			documentName,
		});
		assert.equal(lessonLoadCount, 1);
		const expectedState = Y.encodeStateAsUpdate(firstDocument);
		firstDocument.destroy();

		const competingDocument = new Y.Doc();
		competingDocument.getText("markdown").insert(0, "Competing migration");
		const conflictWinner = await firstStore.initialize(
			lessonId,
			Y.encodeStateAsUpdate(competingDocument),
		);
		competingDocument.destroy();
		assert.deepEqual(conflictWinner, expectedState);

		await db.$client.end();
		db = createDatabase(databaseUrl);

		const restoredDocument = new Y.Doc();
		const restartedPersistence = createLessonDocumentPersistence({
			store: createPostgresLessonDocumentStore(db),
			async initializeDocument() {
				throw new Error("Persisted documents must not use legacy Markdown.");
			},
		});
		await restartedPersistence.load({
			document: restoredDocument,
			documentName,
		});

		assert.equal(
			restoredDocument.getText("markdown").toString(),
			"# PostgreSQL\n\nExact collaborative state.",
		);
		assert.equal(restoredDocument.getMap("metadata").get("themeId"), "dark");
		assert.deepEqual(Y.encodeStateAsUpdate(restoredDocument), expectedState);
		restoredDocument.destroy();
	} finally {
		await db.delete(courses).where(eq(courses.id, courseId));
		await db.$client.end();
	}
});
