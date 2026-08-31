import { queryOptions } from "@tanstack/react-query";
import { courseRepository } from "@/features/courses/repository";

export const lessonQueries = {
	detail: (lessonId: string) =>
		queryOptions({
			queryKey: ["lessons", lessonId] as const,
			queryFn: async () => (await courseRepository.getLesson(lessonId)) ?? null,
		}),
};
