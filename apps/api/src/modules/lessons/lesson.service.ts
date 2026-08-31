import { courses, type Database, lessons } from "@course-studio/db";
import { asc, eq, max } from "drizzle-orm";
import { slugify } from "../../shared/domain/slug.js";
import { ApiError, findPostgresError } from "../../shared/http/errors.js";
import type { CreateLessonInput, UpdateLessonInput } from "./lesson.schema.js";

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
