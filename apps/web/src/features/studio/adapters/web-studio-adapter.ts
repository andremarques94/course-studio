import type { QueryClient } from "@tanstack/react-query";
import { courseQueries } from "@/features/courses/queries";
import { courseRepository } from "@/features/courses/repository";
import { applyLessonSummary } from "@/features/lessons/cache";
import { lessonQueries } from "@/features/lessons/queries";
import type { Lesson, LessonSummary } from "@/features/lessons/types";
import { openPdfExport } from "../export";
import type { StudioCommands } from "../studio-commands";

export function createWebStudioCommands({
	queryClient,
	courseId,
	lessonId,
}: {
	queryClient: QueryClient;
	courseId: string;
	lessonId: string;
}): StudioCommands {
	return {
		async updateLesson(input) {
			if (input.title === undefined) {
				return;
			}
			const updatedLesson = await courseRepository.updateLesson(lessonId, {
				title: input.title,
			});
			queryClient.setQueryData<LessonSummary[]>(
				courseQueries.lessons(courseId).queryKey,
				(current) =>
					current?.map((lesson) =>
						lesson.id === updatedLesson.id ? updatedLesson : lesson,
					),
			);
			queryClient.setQueryData<Lesson | null>(
				lessonQueries.detail(lessonId).queryKey,
				(current) => applyLessonSummary(current, updatedLesson),
			);
		},
		exportPresentation: openPdfExport,
	};
}
