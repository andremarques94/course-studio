import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyLessonMetadata } from "@/features/lessons/cache";
import type { Lesson } from "@/features/lessons/types";

const currentLesson: Lesson = {
	id: "lesson-1",
	courseId: "course-1",
	title: "Old title",
	slug: "old-title",
	markdown: "# Live collaborative content",
	themeId: "dark",
	position: 0,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

test("rename cache updates preserve current collaborative content", () => {
	const renamedLesson: Lesson = {
		...currentLesson,
		title: "New title",
		markdown: "# Stale persisted content",
		themeId: "minimal",
		updatedAt: new Date("2026-01-02T00:00:00.000Z"),
	};

	assert.deepEqual(applyLessonMetadata(currentLesson, renamedLesson), {
		...renamedLesson,
		markdown: currentLesson.markdown,
		themeId: currentLesson.themeId,
	});
	assert.equal(applyLessonMetadata(undefined, currentLesson), currentLesson);
});
