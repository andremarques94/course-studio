export const lessonKeys = {
	detail: (lessonId: string) => ["lessons", lessonId] as const,
	list: (courseId: string) => ["courses", courseId, "lessons"] as const,
};
