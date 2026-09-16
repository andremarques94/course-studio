import { queryOptions } from "@tanstack/react-query";
import { courseRepository } from "@/features/courses/repository";
import { lessonKeys } from "./query-keys";

export const lessonQueries = {
	detail: (lessonId: string) =>
		queryOptions({
			queryKey: lessonKeys.detail(lessonId),
			queryFn: async () => (await courseRepository.getLesson(lessonId)) ?? null,
		}),
};
