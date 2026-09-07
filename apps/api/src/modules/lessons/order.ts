import { type Database, lessonDocuments, lessons } from "@course-studio/db";
import { asc, eq } from "drizzle-orm";
import { ApiError } from "#api/http/errors/api-error";
import { createCourseAccess } from "#api/modules/courses/access";
import { applyPersistedLessonContent } from "#api/modules/lessons/lesson-ydoc";
import type { ReorderLessonsInput } from "#api/modules/lessons/schema";

export function createLessonOrderService(db: Database) {
	return async function reorderLessons(
		userId: string,
		courseId: string,
		input: ReorderLessonsInput,
	) {
		return db.transaction(async (tx) => {
			const access = createCourseAccess(tx);
			await access.lock(courseId);
			await access.requireEditable(userId, courseId);

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

			const rows = await tx
				.select({ lesson: lessons, ydoc: lessonDocuments.ydoc })
				.from(lessons)
				.leftJoin(lessonDocuments, eq(lessonDocuments.lessonId, lessons.id))
				.where(eq(lessons.courseId, courseId))
				.orderBy(asc(lessons.position), asc(lessons.createdAt));

			return Promise.all(
				rows.map(({ lesson, ydoc }) =>
					ydoc
						? applyPersistedLessonContent(lesson, new Uint8Array(ydoc))
						: lesson,
				),
			);
		});
	};
}
