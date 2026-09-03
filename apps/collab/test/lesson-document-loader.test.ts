import { strict as assert } from "node:assert";
import { test } from "node:test";
import * as Y from "yjs";
import { createLessonDocumentLoader } from "../src/documents/lesson-document-loader.js";

const lessonId = "550e8400-e29b-41d4-a716-446655440000";

test("initializes an empty lesson document from the stored lesson", async () => {
	const document = new Y.Doc();
	const loadDocument = createLessonDocumentLoader({
		findLesson: async (id) => {
			assert.equal(id, lessonId);
			return {
				markdown: "# Existing lesson",
				themeId: "academic",
			} as const;
		},
	});

	await loadDocument({ document, documentName: `lesson:${lessonId}` });

	assert.equal(document.getText("markdown").toString(), "# Existing lesson");
	assert.equal(document.getMap("metadata").get("themeId"), "academic");
	document.destroy();
});

test("does not overwrite an existing collaborative document", async () => {
	const document = new Y.Doc();
	document.getText("markdown").insert(0, "Collaborative state");
	document.getMap("metadata").set("themeId", "dark");
	const loadDocument = createLessonDocumentLoader({
		findLesson: async () => ({
			markdown: "Legacy Markdown",
			themeId: "minimal",
		}),
	});

	await loadDocument({ document, documentName: `lesson:${lessonId}` });

	assert.equal(document.getText("markdown").toString(), "Collaborative state");
	assert.equal(document.getMap("metadata").get("themeId"), "dark");
	document.destroy();
});

test("rejects document names outside the lesson room format", async () => {
	const document = new Y.Doc();
	const loadDocument = createLessonDocumentLoader({
		findLesson: async () => ({
			markdown: "Never loaded",
			themeId: "minimal",
		}),
	});

	await assert.rejects(
		loadDocument({ document, documentName: "course:unsafe" }),
	);
	document.destroy();
});
