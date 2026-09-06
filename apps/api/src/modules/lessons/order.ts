import { canEditCourse } from "@course-studio/auth/authorization";
import { courses, type Database, lessons } from "@course-studio/db";
import { asc, eq } from "drizzle-orm";
import { ApiError } from "#api/http/errors/api-error";
import type { ReorderLessonsInput } from "#api/modules/lessons/schema";

export function createLessonOrderService(db: Database) {
	return async function reorderLessons(
		userId: string,
		courseId: string,
		input: ReorderLessonsInput,
	) {
		return db.transaction(async (tx) => {
			const [course] = await tx
				.select()
				.from(courses)
				.where(eq(courses.id, courseId))
				.limit(1);

			if (!course || !canEditCourse(userId, course)) {
				throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
			}

			const currentLessons = await tx
				.select({ id: lessons.id })
				.from(lessons)
				.where(eq(lessons.courseId, courseId));
			const currentIds = new Set(currentLessons.map((lesson) => lesson.id));

			if (
				currentIds.size !== input.lessonIds.length ||
				input.lessonIds.some((id) => !currentIds.has(id))
			) {
				throw new ApiError(
					400,
					"INVALID_LESSON_ORDER",
					"Lesson order must include every lesson in the course exactly once.",
				);
			}

			for (const [position, id] of input.lessonIds.entries()) {
				await tx
					.update(lessons)
					.set({ position, updatedAt: new Date() })
					.where(eq(lessons.id, id));
			}

			return tx
				.select()
				.from(lessons)
				.where(eq(lessons.courseId, courseId))
				.orderBy(asc(lessons.position), asc(lessons.createdAt));
		});
	};
}
