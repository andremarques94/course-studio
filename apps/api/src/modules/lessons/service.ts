import { type Database, lessonDocuments, lessons } from "@course-studio/db";
import { asc, eq, max } from "drizzle-orm";
import { slugify } from "#api/content-naming";
import { findPostgresError } from "#api/database-errors";
import { ApiError } from "#api/http/errors/api-error";
import { createLessonAccess } from "#api/modules/lessons/access";
import { applyPersistedLessonContent } from "#api/modules/lessons/lesson-ydoc";
import { createLessonOrderService } from "#api/modules/lessons/order";
import type {
	CreateLessonInput,
	ReorderLessonsInput,
	UpdateLessonInput,
} from "#api/modules/lessons/schema";

export function createLessonsService(db: Database) {
	const access = createLessonAccess(db);
	const reorderLessons = createLessonOrderService(db);

	return {
		async findByCourse(userId: string, courseId: string) {
			if (!(await access.findViewableCourse(userId, courseId))) {
				throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
			}
			const rows = await db
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
		},

		async findById(userId: string, id: string) {
			const lesson = await access.findViewable(userId, id);
			if (!lesson) {
				return undefined;
			}

			const [persisted] = await db
				.select({ ydoc: lessonDocuments.ydoc })
				.from(lessonDocuments)
				.where(eq(lessonDocuments.lessonId, id))
				.limit(1);
			if (!persisted) {
				return lesson;
			}

			return applyPersistedLessonContent(
				lesson,
				new Uint8Array(persisted.ydoc),
			);
		},

		async create(userId: string, courseId: string, input: CreateLessonInput) {
			return db.transaction(async (tx) => {
				const transactionAccess = createLessonAccess(tx);
				await transactionAccess.lockCourse(courseId);
				await transactionAccess.requireEditableCourse(userId, courseId);

				const [positionResult] = await tx
					.select({ position: max(lessons.position) })
					.from(lessons)
					.where(eq(lessons.courseId, courseId));

				try {
					const [lesson] = await tx
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
			});
		},

		async update(userId: string, id: string, input: UpdateLessonInput) {
			return db.transaction(async (tx) => {
				const transactionAccess = createLessonAccess(tx);
				await transactionAccess.lockCourseForLesson(id);
				await transactionAccess.requireEditable(userId, id);
				const [lesson] = await tx
					.update(lessons)
					.set({ ...input, updatedAt: new Date() })
					.where(eq(lessons.id, id))
					.returning();

				if (!lesson) {
					throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found.");
				}

				const [persisted] = await tx
					.select({ ydoc: lessonDocuments.ydoc })
					.from(lessonDocuments)
					.where(eq(lessonDocuments.lessonId, id))
					.limit(1);

				return persisted
					? applyPersistedLessonContent(lesson, new Uint8Array(persisted.ydoc))
					: lesson;
			});
		},

		async reorder(
			userId: string,
			courseId: string,
			input: ReorderLessonsInput,
		) {
			return reorderLessons(userId, courseId, input);
		},

		async delete(userId: string, id: string) {
			return db.transaction(async (tx) => {
				const transactionAccess = createLessonAccess(tx);
				await transactionAccess.lockCourseForLesson(id);
				await transactionAccess.requireEditable(userId, id);
				const [lesson] = await tx
					.delete(lessons)
					.where(eq(lessons.id, id))
					.returning({ id: lessons.id });

				if (!lesson) {
					throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found.");
				}
			});
		},
	};
}

export type LessonsService = ReturnType<typeof createLessonsService>;
