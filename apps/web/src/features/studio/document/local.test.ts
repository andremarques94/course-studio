import { strict as assert } from "node:assert";
import { test } from "node:test";
import * as Y from "yjs";
import { createLocalLessonDocument } from "./local";
import { createLessonDocumentModel } from "./model";

test("initializes a local lesson document", () => {
	const document = createLocalLessonDocument("# Existing lesson", "academic");

	assert.equal(document.markdown.toString(), "# Existing lesson");
	assert.deepEqual(document.getSnapshot(), {
		markdown: "# Existing lesson",
		themeId: "academic",
		ready: true,
	});

	document.destroy();
});

test("publishes Y.Text changes through the Markdown snapshot interface", () => {
	const document = createLocalLessonDocument("Initial", "minimal");
	let notifications = 0;
	const unsubscribe = document.subscribe(() => {
		notifications += 1;
	});

	document.markdown.insert(document.markdown.length, " update");

	assert.equal(document.getSnapshot().markdown, "Initial update");
	assert.equal(notifications, 1);

	unsubscribe();
	document.markdown.insert(document.markdown.length, " ignored");
	assert.equal(notifications, 1);
	document.destroy();
});

test("synchronizes theme changes through the Yjs document", () => {
	const firstDocument = createLocalLessonDocument("Initial", "minimal");
	const secondDocument = createLocalLessonDocument("Initial", "minimal");
	Y.applyUpdate(secondDocument.ydoc, Y.encodeStateAsUpdate(firstDocument.ydoc));
	Y.applyUpdate(firstDocument.ydoc, Y.encodeStateAsUpdate(secondDocument.ydoc));
	let notifications = 0;
	secondDocument.subscribe(() => {
		notifications += 1;
	});

	firstDocument.setThemeId("dark");
	Y.applyUpdate(secondDocument.ydoc, Y.encodeStateAsUpdate(firstDocument.ydoc));

	assert.equal(secondDocument.getSnapshot().themeId, "dark");
	assert.equal(notifications, 1);
	firstDocument.destroy();
	secondDocument.destroy();
});

test("rejects invalid theme metadata from a collaborative update", () => {
	const document = createLocalLessonDocument("Initial", "minimal");

	document.ydoc.getMap("metadata").set("themeId", "untrusted-theme");

	assert.equal(document.getSnapshot().themeId, null);
	document.destroy();
});

test("publishes one combined snapshot for a document transaction", () => {
	const ydoc = new Y.Doc();
	const document = createLessonDocumentModel(ydoc, false);
	let notifications = 0;
	document.subscribe(() => {
		notifications += 1;
	});

	ydoc.transact(() => {
		document.markdown.insert(0, "Connected");
		ydoc.getMap("metadata").set("themeId", "dark");
	});

	assert.deepEqual(document.getSnapshot(), {
		markdown: "Connected",
		themeId: "dark",
		ready: false,
	});
	assert.equal(notifications, 1);

	document.markReady();
	assert.equal(document.getSnapshot().ready, true);
	assert.equal(notifications, 2);
	document.destroy();
});
