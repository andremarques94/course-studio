import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { courses, createDatabase, lessons } from "@course-studio/db";
import { eq } from "drizzle-orm";
import * as Y from "yjs";
import {
	createLessonDocumentPersistence,
	createPostgresLessonDocumentStore,
} from "../src/documents/lesson-document-persistence.js";

const databaseUrl = process.env.DATABASE_URL;

test("restores a lesson document from PostgreSQL after recreating the collaboration database client", {
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
		});

		const firstDocument = new Y.Doc();
		firstDocument
			.getText("markdown")
			.insert(0, "# PostgreSQL\n\nExact collaborative state.");
		const firstPersistence = createLessonDocumentPersistence({
			store: createPostgresLessonDocumentStore(db),
			async initializeDocument({ document }) {
				return document;
			},
		});
		await firstPersistence.store({
			document: firstDocument,
			documentName,
		});
		const expectedState = Y.encodeStateAsUpdate(firstDocument);
		firstDocument.destroy();

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
		assert.deepEqual(Y.encodeStateAsUpdate(restoredDocument), expectedState);
		restoredDocument.destroy();
	} finally {
		await db.delete(courses).where(eq(courses.id, courseId));
		await db.$client.end();
	}
});
