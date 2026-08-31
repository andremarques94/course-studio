import { queryOptions } from "@tanstack/react-query";
import { courseRepository } from "./repository";

export const courseQueries = {
	all: () =>
		queryOptions({
			queryKey: ["courses"] as const,
			queryFn: () => courseRepository.getCourses(),
		}),
	detail: (courseId: string) =>
		queryOptions({
			queryKey: ["courses", courseId] as const,
			queryFn: async () => (await courseRepository.getCourse(courseId)) ?? null,
		}),
	lessons: (courseId: string) =>
		queryOptions({
			queryKey: ["courses", courseId, "lessons"] as const,
			queryFn: () => courseRepository.getLessons(courseId),
		}),
};
