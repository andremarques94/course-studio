import { strict as assert } from "node:assert";
import { test } from "node:test";
import * as Y from "yjs";
import {
	createBrowserLessonDraftStorage,
	createDraftStorageStatusStore,
	lessonDraftStorageKey,
	persistLessonDraft,
} from "./persistence";

function createMemoryStorage() {
	const values = new Map<string, string>();
	return {
		getItem(key: string) {
			return values.get(key) ?? null;
		},
		setItem(key: string, value: string) {
			values.set(key, value);
		},
	};
}

test("restores an offline edit after the first document disappears", () => {
	const storage = createBrowserLessonDraftStorage(createMemoryStorage());
	const key = lessonDraftStorageKey("user-1", "lesson-1");
	const first = new Y.Doc();
	const firstPersistence = persistLessonDraft({
		document: first,
		key,
		storage,
		onError: assert.fail,
	});
	first.getText("markdown").insert(0, "Draft written offline");

	const restored = new Y.Doc();
	const restoredPersistence = persistLessonDraft({
		document: restored,
		key,
		storage,
		onError: assert.fail,
	});
	assert.equal(restoredPersistence.restored, true);
	assert.equal(
		restored.getText("markdown").toString(),
		"Draft written offline",
	);

	firstPersistence.destroy();
	restoredPersistence.destroy();
	first.destroy();
	restored.destroy();
});

test("scopes saved drafts by both user and lesson", () => {
	assert.notEqual(
		lessonDraftStorageKey("user-1", "lesson-1"),
		lessonDraftStorageKey("user-2", "lesson-1"),
	);
	assert.notEqual(
		lessonDraftStorageKey("user-1", "lesson-1"),
		lessonDraftStorageKey("user-1", "lesson-2"),
	);
});

test("reports storage write failures so navigation can be guarded", () => {
	const document = new Y.Doc();
	const status = createDraftStorageStatusStore();
	const persistence = persistLessonDraft({
		document,
		key: "draft",
		storage: {
			load: () => null,
			save() {
				throw new Error("quota exceeded");
			},
		},
		onError: status.setError,
	});

	document.getText("markdown").insert(0, "Unsaved");
	assert.equal(status.getSnapshot(), "error");

	persistence.destroy();
	status.destroy();
	document.destroy();
});
