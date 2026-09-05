import { canEditLesson } from "@course-studio/auth/authorization";
import { courses, type Database, lessons } from "@course-studio/db";
import { eq } from "drizzle-orm";

type FindLessonOwner = (lessonId: string) => Promise<string | undefined>;

export function createLessonAuthorizer(findLessonOwner: FindLessonOwner) {
	return async (userId: string, lessonId: string) => {
		const ownerId = await findLessonOwner(lessonId);
		return ownerId ? canEditLesson(userId, { course: { ownerId } }) : false;
	};
}

export function createPostgresLessonOwnerFinder(db: Database): FindLessonOwner {
	return async (lessonId) => {
		const [lesson] = await db
			.select({ ownerId: courses.ownerId })
			.from(lessons)
			.innerJoin(courses, eq(lessons.courseId, courses.id))
			.where(eq(lessons.id, lessonId))
			.limit(1);
		return lesson?.ownerId;
	};
}
