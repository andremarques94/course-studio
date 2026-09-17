import { courseMembers, courses, type Database } from "@course-studio/db";
import { and, asc, eq, or } from "drizzle-orm";
import { slugify } from "#api/content-naming";
import { findPostgresErrorCode } from "#api/database-errors";
import { ApiError } from "#api/http/errors/api-error";
import {
	createCourseAccess,
	resolveAccessRole,
} from "#api/modules/courses/access";
import type {
	CreateCourseInput,
	UpdateCourseInput,
} from "#api/modules/courses/schema";

export function createCoursesService(db: Database) {
	const access = createCourseAccess(db);

	return {
		async findAll(userId: string) {
			const results = await db
				.select({ course: courses, membershipRole: courseMembers.role })
				.from(courses)
				.leftJoin(
					courseMembers,
					and(
						eq(courseMembers.courseId, courses.id),
						eq(courseMembers.userId, userId),
					),
				)
				.where(
					or(eq(courses.ownerId, userId), eq(courseMembers.userId, userId)),
				)
				.orderBy(asc(courses.createdAt));

			return results.map(({ course, membershipRole }) => ({
				...course,
				accessRole: resolveAccessRole(userId, course.ownerId, membershipRole),
			}));
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

				return { ...course, accessRole: "owner" as const };
			} catch (error) {
				if (findPostgresErrorCode(error) === "23505") {
					throw new ApiError(
						409,
						"SLUG_ALREADY_EXISTS",
						"A course with this slug already exists in your account.",
					);
				}
				throw error;
			}
		},

		async update(userId: string, id: string, input: UpdateCourseInput) {
			return db.transaction(async (tx) => {
				const transactionAccess = createCourseAccess(tx);
				await transactionAccess.lock(id);
				const accessibleCourse = await transactionAccess.requireEditable(
					userId,
					id,
				);
				const [course] = await tx
					.update(courses)
					.set({ title: input.title, updatedAt: new Date() })
					.where(eq(courses.id, id))
					.returning();

				if (!course) {
					throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
				}

				return { ...course, accessRole: accessibleCourse.accessRole };
			});
		},

		async delete(userId: string, id: string) {
			await access.requireManageable(userId, id);
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
