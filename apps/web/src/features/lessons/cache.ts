import type { Lesson, LessonSummary } from "./types";

export function applyLessonSummary(
	current: Lesson | null | undefined,
	summary: LessonSummary,
) {
	return current ? { ...current, ...summary } : current;
}
