import { type Database, lessonDocuments, lessons } from "@course-studio/db";
import { eq, sql } from "drizzle-orm";
import * as Y from "yjs";
import { parseLessonDocumentName } from "./lesson-document-loader.js";

type LessonDocumentPersistenceInput = {
	document: Y.Doc;
	documentName: string;
};

export type LessonDocumentStore = {
	load(lessonId: string): Promise<Uint8Array | null>;
	initialize(lessonId: string, state: Uint8Array): Promise<Uint8Array>;
	store(lessonId: string, state: Uint8Array): Promise<void>;
};

type LessonDocumentPersistenceOptions = {
	store: LessonDocumentStore;
	initializeDocument(input: LessonDocumentPersistenceInput): Promise<void>;
};

export function createPostgresLessonDocumentStore(
	db: Database,
): LessonDocumentStore {
	async function load(lessonId: string) {
		const document = await db.query.lessonDocuments.findFirst({
			columns: { ydoc: true },
			where: (table, { eq }) => eq(table.lessonId, lessonId),
		});

		return document ? new Uint8Array(document.ydoc) : null;
	}

	return {
		load,

		async initialize(lessonId, state) {
			const [inserted] = await db
				.insert(lessonDocuments)
				.values({ lessonId, ydoc: Buffer.from(state) })
				.onConflictDoNothing({ target: lessonDocuments.lessonId })
				.returning({ ydoc: lessonDocuments.ydoc });

			if (inserted) {
				return new Uint8Array(inserted.ydoc);
			}

			const persistedState = await load(lessonId);
			if (!persistedState) {
				throw new Error(
					`Could not initialize lesson document ${lessonId}: persisted state is unavailable.`,
				);
			}

			return persistedState;
		},

		async store(lessonId, state) {
			await db.transaction(async (transaction) => {
				await transaction.execute(
					sql`select pg_advisory_xact_lock(hashtextextended(${lessonId}, 0))`,
				);
				const [existing] = await transaction
					.select({ ydoc: lessonDocuments.ydoc })
					.from(lessonDocuments)
					.where(eq(lessonDocuments.lessonId, lessonId));
				const mergedState = existing
					? Y.mergeUpdates([new Uint8Array(existing.ydoc), state])
					: state;
				const projection = readDocumentProjection(mergedState);
				const updatedAt = new Date();
				await transaction
					.insert(lessonDocuments)
					.values({ lessonId, ydoc: Buffer.from(mergedState) })
					.onConflictDoUpdate({
						target: lessonDocuments.lessonId,
						set: { ydoc: Buffer.from(mergedState), updatedAt },
					});
				await transaction
					.update(lessons)
					.set({ ...projection, updatedAt })
					.where(eq(lessons.id, lessonId));
			});
		},
	};
}

function readDocumentProjection(state: Uint8Array) {
	const document = new Y.Doc();
	try {
		Y.applyUpdate(document, state);
		const themeId = document.getMap("metadata").get("themeId");
		return {
			markdown: document.getText("markdown").toString(),
			themeId:
				themeId === "minimal" || themeId === "academic" || themeId === "dark"
					? themeId
					: "minimal",
		};
	} finally {
		document.destroy();
	}
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

			const candidate = new Y.Doc();

			try {
				await initializeDocument({
					document: candidate,
					documentName: input.documentName,
				});
				const initializedState = Y.encodeStateAsUpdate(candidate);
				const persistedState = await store.initialize(
					lessonId,
					initializedState,
				);
				Y.applyUpdate(input.document, persistedState);
				return input.document;
			} finally {
				candidate.destroy();
			}
		},

		async store({ document, documentName }: LessonDocumentPersistenceInput) {
			const lessonId = parseLessonDocumentName(documentName);
			await store.store(lessonId, Y.encodeStateAsUpdate(document));
		},
	};
}
