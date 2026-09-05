import {
	canEditLesson,
	canViewCourse,
} from "@course-studio/auth/authorization";
import { courses, type Database, lessons } from "@course-studio/db";
import { eq } from "drizzle-orm";
import { ApiError } from "#api/http/errors/api-error";
import { createCourseAccess } from "#api/modules/courses/access";

export function createLessonAccess(db: Database) {
	const courseAccess = createCourseAccess(db);

	async function findLessonWithOwner(lessonId: string) {
		const [result] = await db
			.select({ lesson: lessons, ownerId: courses.ownerId })
			.from(lessons)
			.innerJoin(courses, eq(lessons.courseId, courses.id))
			.where(eq(lessons.id, lessonId))
			.limit(1);
		return result;
	}

	return {
		findViewableCourse: courseAccess.findViewable,
		requireEditableCourse: courseAccess.requireEditable,

		async findViewable(userId: string, lessonId: string) {
			const result = await findLessonWithOwner(lessonId);
			return result && canViewCourse(userId, { ownerId: result.ownerId })
				? result.lesson
				: undefined;
		},

		async requireEditable(userId: string, lessonId: string) {
			const result = await findLessonWithOwner(lessonId);
			if (
				!result ||
				!canEditLesson(userId, { course: { ownerId: result.ownerId } })
			) {
				throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found.");
			}
			return result.lesson;
		},
	};
}
