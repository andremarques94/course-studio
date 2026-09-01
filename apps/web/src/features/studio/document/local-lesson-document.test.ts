import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createLocalLessonDocument } from "./local-lesson-document";

test("initializes the collaborative Markdown once", () => {
	const document = createLocalLessonDocument("# Existing lesson");

	assert.equal(document.markdown.toString(), "# Existing lesson");
	assert.equal(document.getMarkdownSnapshot(), "# Existing lesson");

	document.destroy();
});

test("publishes Y.Text changes through the Markdown snapshot interface", () => {
	const document = createLocalLessonDocument("Initial");
	let notifications = 0;
	const unsubscribe = document.subscribeToMarkdown(() => {
		notifications += 1;
	});

	document.markdown.insert(document.markdown.length, " update");

	assert.equal(document.getMarkdownSnapshot(), "Initial update");
	assert.equal(notifications, 1);

	unsubscribe();
	document.markdown.insert(document.markdown.length, " ignored");
	assert.equal(notifications, 1);
	document.destroy();
});
