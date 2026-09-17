import { queryOptions } from "@tanstack/react-query";
import { lessonKeys } from "@/features/lessons/query-keys";
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
			queryKey: lessonKeys.list(courseId),
			queryFn: () => courseRepository.getLessons(courseId),
		}),
	members: (courseId: string) =>
		queryOptions({
			queryKey: ["courses", courseId, "members"] as const,
			queryFn: () => courseRepository.getMembers(courseId),
		}),
	invitations: (courseId: string) =>
		queryOptions({
			queryKey: ["courses", courseId, "invitations"] as const,
			queryFn: () => courseRepository.getInvitations(courseId),
		}),
};
