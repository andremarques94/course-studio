import { type Database, lessonDocuments } from "@course-studio/db";
import * as Y from "yjs";
import { parseLessonDocumentName } from "./lesson-document-loader.js";

type LessonDocumentPersistenceInput = {
	document: Y.Doc;
	documentName: string;
};

export type LessonDocumentStore = {
	load(lessonId: string): Promise<Uint8Array | null>;
	store(lessonId: string, state: Uint8Array): Promise<void>;
};

type LessonDocumentPersistenceOptions = {
	store: LessonDocumentStore;
	initializeDocument(input: LessonDocumentPersistenceInput): Promise<Y.Doc>;
};

export function createPostgresLessonDocumentStore(
	db: Database,
): LessonDocumentStore {
	return {
		async load(lessonId) {
			const document = await db.query.lessonDocuments.findFirst({
				columns: { ydoc: true },
				where: (table, { eq }) => eq(table.lessonId, lessonId),
			});

			return document ? new Uint8Array(document.ydoc) : null;
		},

		async store(lessonId, state) {
			await db
				.insert(lessonDocuments)
				.values({ lessonId, ydoc: Buffer.from(state) })
				.onConflictDoUpdate({
					target: lessonDocuments.lessonId,
					set: { ydoc: Buffer.from(state), updatedAt: new Date() },
				});
		},
	};
}

export function createLessonDocumentPersistence({
	store,
	initializeDocument,
}: LessonDocumentPersistenceOptions) {
	return {
		async load(input: LessonDocumentPersistenceInput) {
			const lessonId = parseLessonDocumentName(input.documentName);
			const state = await store.load(lessonId);

			if (state) {
				Y.applyUpdate(input.document, state);
				return input.document;
			}

			return initializeDocument(input);
		},

		async store({ document, documentName }: LessonDocumentPersistenceInput) {
			const lessonId = parseLessonDocumentName(documentName);
			await store.store(lessonId, Y.encodeStateAsUpdate(document));
		},
	};
}
