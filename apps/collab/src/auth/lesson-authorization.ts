import {
	type CourseAccess,
	canEditLesson,
} from "@course-studio/auth/authorization";
import {
	courseMembers,
	courses,
	type Database,
	lessons,
} from "@course-studio/db";
import { and, eq } from "drizzle-orm";

export type FindLessonAccess = (
	userId: string,
	lessonId: string,
) => Promise<CourseAccess | undefined>;

export function createLessonAuthorizer(findLessonAccess: FindLessonAccess) {
	return async (userId: string, lessonId: string) => {
		const course = await findLessonAccess(userId, lessonId);
		return course ? canEditLesson(userId, { course }) : false;
	};
}

export function createPostgresLessonAccessFinder(
	db: Database,
): FindLessonAccess {
	return async (userId, lessonId) => {
		const [lesson] = await db
			.select({
				ownerId: courses.ownerId,
				membershipRole: courseMembers.role,
			})
			.from(lessons)
			.innerJoin(courses, eq(lessons.courseId, courses.id))
			.leftJoin(
				courseMembers,
				and(
					eq(courseMembers.courseId, courses.id),
					eq(courseMembers.userId, userId),
				),
			)
			.where(eq(lessons.id, lessonId))
			.limit(1);
		return lesson;
	};
}
