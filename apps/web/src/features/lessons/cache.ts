import type { QueryClient } from "@tanstack/react-query";
import { lessonKeys } from "./query-keys";
import type { Lesson, LessonSummary } from "./types";

export function applyLessonSummary(
	current: Lesson | null | undefined,
	summary: LessonSummary,
) {
	return current ? { ...current, ...summary } : current;
}

export function updateLessonCache(
	queryClient: QueryClient,
	summary: LessonSummary,
) {
	queryClient.setQueryData<LessonSummary[]>(
		lessonKeys.list(summary.courseId),
		(current) =>
			current?.map((lesson) => (lesson.id === summary.id ? summary : lesson)),
	);
	queryClient.setQueryData<Lesson | null>(
		lessonKeys.detail(summary.id),
		(current) => applyLessonSummary(current, summary),
	);
}
