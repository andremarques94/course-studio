import type { QueryClient } from "@tanstack/react-query";
import { courseQueries } from "@/features/courses/queries";
import { courseRepository } from "@/features/courses/repository";
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
			const updatedLesson = await courseRepository.updateLesson(
				lessonId,
				input,
			);
			queryClient.setQueryData(
				lessonQueries.detail(lessonId).queryKey,
				updatedLesson,
			);
			queryClient.setQueryData<Lesson[]>(
				courseQueries.lessons(courseId).queryKey,
				(current) =>
					current?.map((lesson) =>
						lesson.id === updatedLesson.id ? updatedLesson : lesson,
					),
			);
		},
		exportPresentation: openPdfExport,
	};
}
