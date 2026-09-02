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
		async initialize(id, state) {
			const persistedState = documents.get(id) ?? state;
			documents.set(id, persistedState.slice());
			return persistedState.slice();
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
		async initializeDocument() {
			initialized = true;
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

test("initializes and persists a legacy lesson exactly once", async () => {
	const store = createMemoryStore();
	let initializationCount = 0;
	const persistence = createLessonDocumentPersistence({
		store,
		async initializeDocument({ document }) {
			initializationCount += 1;
			document.getText("markdown").insert(0, "Legacy Markdown");
		},
	});
	const firstDocument = new Y.Doc();

	await persistence.load({ document: firstDocument, documentName });
	const persistedState = store.documents.get(lessonId);

	assert.equal(initializationCount, 1);
	assert.ok(persistedState);
	assert.equal(firstDocument.getText("markdown").toString(), "Legacy Markdown");
	assert.deepEqual(Y.encodeStateAsUpdate(firstDocument), persistedState);
	firstDocument.destroy();

	const secondDocument = new Y.Doc();
	await persistence.load({ document: secondDocument, documentName });

	assert.equal(initializationCount, 1);
	assert.equal(
		secondDocument.getText("markdown").toString(),
		"Legacy Markdown",
	);
	assert.deepEqual(Y.encodeStateAsUpdate(secondDocument), persistedState);
	secondDocument.destroy();
});

test("concurrent initializations converge on the first persisted state", async () => {
	const store = createMemoryStore();
	let initializationCount = 0;
	const persistence = createLessonDocumentPersistence({
		store,
		async initializeDocument({ document }) {
			initializationCount += 1;
			document
				.getText("markdown")
				.insert(0, `Legacy Markdown ${initializationCount}`);
		},
	});
	const firstDocument = new Y.Doc();
	const secondDocument = new Y.Doc();

	await Promise.all([
		persistence.load({ document: firstDocument, documentName }),
		persistence.load({ document: secondDocument, documentName }),
	]);

	const persistedState = store.documents.get(lessonId);
	assert.ok(persistedState);
	assert.equal(initializationCount, 2);
	assert.deepEqual(Y.encodeStateAsUpdate(firstDocument), persistedState);
	assert.deepEqual(Y.encodeStateAsUpdate(secondDocument), persistedState);
	assert.equal(
		firstDocument.getText("markdown").toString(),
		secondDocument.getText("markdown").toString(),
	);
	firstDocument.destroy();
	secondDocument.destroy();
});

test("rejects invalid room names before accessing persistence", async () => {
	let accessedStore = false;
	const persistence = createLessonDocumentPersistence({
		store: {
			async load() {
				accessedStore = true;
				return null;
			},
			async initialize() {
				accessedStore = true;
				return new Uint8Array();
			},
			async store() {
				accessedStore = true;
			},
		},
		async initializeDocument() {},
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
