import { courses, type Database } from "@course-studio/db";
import { asc, eq } from "drizzle-orm";
import { slugify } from "../../shared/domain/slug.js";
import { ApiError, findPostgresError } from "../../shared/http/errors.js";
import type { CreateCourseInput, UpdateCourseInput } from "./course.schema.js";

export function createCoursesService(db: Database) {
	return {
		async findAll() {
			return db.select().from(courses).orderBy(asc(courses.createdAt));
		},

		async findById(id: string) {
			const [course] = await db
				.select()
				.from(courses)
				.where(eq(courses.id, id))
				.limit(1);

			return course;
		},

		async create(input: CreateCourseInput) {
			try {
				const [course] = await db
					.insert(courses)
					.values({ title: input.title, slug: slugify(input.title) })
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

		async update(id: string, input: UpdateCourseInput) {
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

		async delete(id: string) {
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
