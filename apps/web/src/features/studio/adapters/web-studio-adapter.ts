import type { QueryClient } from "@tanstack/react-query";
import { courseRepository } from "@/features/courses/repository";
import { updateLessonCache } from "@/features/lessons/cache";
import { openPdfExport } from "../export";
import type { StudioCommands } from "../studio-commands";

export function createWebStudioCommands({
	queryClient,
	lessonId,
}: {
	queryClient: QueryClient;
	lessonId: string;
}): StudioCommands {
	return {
		async renameLesson(title) {
			const updatedLesson = await courseRepository.updateLesson(lessonId, {
				title,
			});
			updateLessonCache(queryClient, updatedLesson);
		},
		exportPresentation: openPdfExport,
	};
}
