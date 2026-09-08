import {
	canEditLesson,
	canViewCourse,
} from "@course-studio/auth/authorization";
import { courseMembers, courses, lessons } from "@course-studio/db";
import { and, eq } from "drizzle-orm";
import { ApiError } from "#api/http/errors/api-error";
import {
	type CourseAccessExecutor,
	createCourseAccess,
} from "#api/modules/courses/access";

export function createLessonAccess(db: CourseAccessExecutor) {
	const courseAccess = createCourseAccess(db);

	async function findLessonWithAccess(userId: string, lessonId: string) {
		const [result] = await db
			.select({
				lesson: lessons,
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
		return result;
	}

	return {
		findViewableCourse: courseAccess.findViewable,
		lockCourse: courseAccess.lock,
		requireEditableCourse: courseAccess.requireEditable,

		async lockCourseForLesson(lessonId: string) {
			const [course] = await db
				.select({ id: courses.id })
				.from(courses)
				.innerJoin(lessons, eq(lessons.courseId, courses.id))
				.where(eq(lessons.id, lessonId))
				.limit(1)
				.for("update", { of: courses });
			return course;
		},

		async findViewable(userId: string, lessonId: string) {
			const result = await findLessonWithAccess(userId, lessonId);
			return result &&
				canViewCourse(userId, {
					ownerId: result.ownerId,
					membershipRole: result.membershipRole,
				})
				? result.lesson
				: undefined;
		},

		async requireEditable(userId: string, lessonId: string) {
			const result = await findLessonWithAccess(userId, lessonId);
			if (
				!result ||
				!canEditLesson(userId, {
					course: {
						ownerId: result.ownerId,
						membershipRole: result.membershipRole,
					},
				})
			) {
				throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found.");
			}
			return result.lesson;
		},
	};
}
