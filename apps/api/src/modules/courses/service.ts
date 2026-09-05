import { courses, type Database } from "@course-studio/db";
import { asc, eq } from "drizzle-orm";
import { slugify } from "#api/content-naming";
import { findPostgresError } from "#api/database-errors";
import { ApiError } from "#api/http/errors/api-error";
import { createCourseAccess } from "#api/modules/courses/access";
import type {
	CreateCourseInput,
	UpdateCourseInput,
} from "#api/modules/courses/schema";

export function createCoursesService(db: Database) {
	const access = createCourseAccess(db);

	return {
		async findAll(userId: string) {
			return db
				.select()
				.from(courses)
				.where(eq(courses.ownerId, userId))
				.orderBy(asc(courses.createdAt));
		},

		async findById(userId: string, id: string) {
			return access.findViewable(userId, id);
		},

		async create(userId: string, input: CreateCourseInput) {
			try {
				const [course] = await db
					.insert(courses)
					.values({
						ownerId: userId,
						title: input.title,
						slug: slugify(input.title),
					})
					.returning();

				if (!course) {
					throw new Error("Course insert returned no row.");
				}

				return course;
			} catch (error) {
				if (findPostgresError(error)?.code === "23505") {
					throw new ApiError(
						409,
						"SLUG_ALREADY_EXISTS",
						"A course with this slug already exists.",
					);
				}
				throw error;
			}
		},

		async update(userId: string, id: string, input: UpdateCourseInput) {
			await access.requireEditable(userId, id);
			const [course] = await db
				.update(courses)
				.set({ title: input.title, updatedAt: new Date() })
				.where(eq(courses.id, id))
				.returning();

			if (!course) {
				throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
			}

			return course;
		},

		async delete(userId: string, id: string) {
			await access.requireEditable(userId, id);
			const [course] = await db
				.delete(courses)
				.where(eq(courses.id, id))
				.returning({ id: courses.id });

			if (!course) {
				throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
			}
		},
	};
}

export type CoursesService = ReturnType<typeof createCoursesService>;
