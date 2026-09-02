import { strict as assert } from "node:assert";
import { test } from "node:test";
import * as Y from "yjs";
import {
	createLessonDocumentPersistence,
	type LessonDocumentStore,
} from "../src/documents/lesson-document-persistence.js";

const lessonId = "550e8400-e29b-41d4-a716-446655440000";
const documentName = `lesson:${lessonId}`;

function createMemoryStore(): LessonDocumentStore & {
	documents: Map<string, Uint8Array>;
} {
	const documents = new Map<string, Uint8Array>();

	return {
		documents,
		async load(id) {
			return documents.get(id) ?? null;
		},
		async store(id, state) {
			documents.set(id, state.slice());
		},
	};
}

test("restores the encoded Yjs state after a collaboration server restart", async () => {
	const store = createMemoryStore();
	const persistence = createLessonDocumentPersistence({
		store,
		async initializeDocument({ document }) {
			document.getText("markdown").insert(0, "# Initial");
			document.getMap("metadata").set("themeId", "minimal");
			return document;
		},
	});
	const firstDocument = new Y.Doc();
	await persistence.load({ document: firstDocument, documentName });
	firstDocument.getText("markdown").insert(9, "\n\nCollaborative edit");
	await persistence.store({ document: firstDocument, documentName });
	const persistedState = store.documents.get(lessonId);
	assert.ok(persistedState);
	firstDocument.destroy();

	let initialized = false;
	const restartedPersistence = createLessonDocumentPersistence({
		store,
		async initializeDocument({ document }) {
			initialized = true;
			return document;
		},
	});
	const restoredDocument = new Y.Doc();
	await restartedPersistence.load({
		document: restoredDocument,
		documentName,
	});

	assert.equal(initialized, false);
	assert.equal(
		restoredDocument.getText("markdown").toString(),
		"# Initial\n\nCollaborative edit",
	);
	assert.equal(restoredDocument.getMap("metadata").get("themeId"), "minimal");
	assert.deepEqual(Y.encodeStateAsUpdate(restoredDocument), persistedState);
	restoredDocument.destroy();
});

test("uses the lesson initializer only when no persisted state exists", async () => {
	const store = createMemoryStore();
	let initializationCount = 0;
	const persistence = createLessonDocumentPersistence({
		store,
		async initializeDocument({ document }) {
			initializationCount += 1;
			document.getText("markdown").insert(0, "Legacy Markdown");
			return document;
		},
	});
	const document = new Y.Doc();

	await persistence.load({ document, documentName });

	assert.equal(initializationCount, 1);
	assert.equal(document.getText("markdown").toString(), "Legacy Markdown");
	document.destroy();
});

test("rejects invalid room names before accessing persistence", async () => {
	let accessedStore = false;
	const persistence = createLessonDocumentPersistence({
		store: {
			async load() {
				accessedStore = true;
				return null;
			},
			async store() {
				accessedStore = true;
			},
		},
		async initializeDocument({ document }) {
			return document;
		},
	});
	const document = new Y.Doc();

	await assert.rejects(
		persistence.load({ document, documentName: "course:unsafe" }),
	);
	await assert.rejects(
		persistence.store({ document, documentName: "course:unsafe" }),
	);
	assert.equal(accessedStore, false);
	document.destroy();
});
