import type { QueryClient } from "@tanstack/react-query";
import { courseQueries } from "@/features/courses/queries";
import { courseRepository } from "@/features/courses/repository";
import { applyLessonMetadata } from "@/features/lessons/cache";
import { lessonQueries } from "@/features/lessons/queries";
import type { Lesson } from "@/features/lessons/types";
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
			queryClient.setQueryData<Lesson[]>(
				courseQueries.lessons(courseId).queryKey,
				(current) =>
					current?.map((lesson) =>
						lesson.id === updatedLesson.id
							? applyLessonMetadata(lesson, updatedLesson)
							: lesson,
					),
			);
			await queryClient.invalidateQueries({
				queryKey: lessonQueries.detail(lessonId).queryKey,
				exact: true,
			});
		},
		exportPresentation: openPdfExport,
	};
}
