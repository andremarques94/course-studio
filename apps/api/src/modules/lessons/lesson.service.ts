import { courses, type Database, lessons } from "@course-studio/db";
import { asc, eq, max } from "drizzle-orm";
import { slugify } from "../../shared/domain/slug.js";
import { ApiError, findPostgresError } from "../../shared/http/errors.js";
import type {
	CreateLessonInput,
	ReorderLessonsInput,
	UpdateLessonInput,
} from "./lesson.schema.js";

export function createLessonsService(db: Database) {
	return {
		async findByCourse(courseId: string) {
			return db
				.select()
				.from(lessons)
				.where(eq(lessons.courseId, courseId))
				.orderBy(asc(lessons.position), asc(lessons.createdAt));
		},

		async findById(id: string) {
			const [lesson] = await db
				.select()
				.from(lessons)
				.where(eq(lessons.id, id))
				.limit(1);

			return lesson;
		},

		async create(courseId: string, input: CreateLessonInput) {
			const [course] = await db
				.select({ id: courses.id })
				.from(courses)
				.where(eq(courses.id, courseId))
				.limit(1);

			if (!course) {
				throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
			}

			const [positionResult] = await db
				.select({ position: max(lessons.position) })
				.from(lessons)
				.where(eq(lessons.courseId, courseId));

			try {
				const [lesson] = await db
					.insert(lessons)
					.values({
						courseId,
						title: input.title,
						slug: slugify(input.title),
						markdown: `# ${input.title}`,
						position: (positionResult?.position ?? -1) + 1,
					})
					.returning();

				if (!lesson) {
					throw new Error("Lesson insert returned no row.");
				}

				return lesson;
			} catch (error) {
				if (findPostgresError(error)?.code === "23505") {
					throw new ApiError(
						409,
						"SLUG_ALREADY_EXISTS",
						"A lesson with this slug already exists in the course.",
					);
				}
				throw error;
			}
		},

		async update(id: string, input: UpdateLessonInput) {
			const [lesson] = await db
				.update(lessons)
				.set({ ...input, updatedAt: new Date() })
				.where(eq(lessons.id, id))
				.returning();

			if (!lesson) {
				throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found.");
			}

			return lesson;
		},

		async reorder(courseId: string, input: ReorderLessonsInput) {
			return db.transaction(async (tx) => {
				const [course] = await tx
					.select({ id: courses.id })
					.from(courses)
					.where(eq(courses.id, courseId))
					.limit(1);

				if (!course) {
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
		},

		async delete(id: string) {
			const [lesson] = await db
				.delete(lessons)
				.where(eq(lessons.id, id))
				.returning({ id: lessons.id });

			if (!lesson) {
				throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found.");
			}
		},
	};
}

export type LessonsService = ReturnType<typeof createLessonsService>;
