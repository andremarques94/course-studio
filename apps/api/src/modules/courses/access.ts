import {
	canEditCourse,
	canManageCourseMembers,
	canViewCourse,
} from "@course-studio/auth/authorization";
import { courseMembers, courses, type Database } from "@course-studio/db";
import { and, eq } from "drizzle-orm";
import { ApiError } from "#api/http/errors/api-error";

export type CourseAccessExecutor = Pick<Database, "select">;

function accessRole(
	userId: string,
	ownerId: string,
	membershipRole: "editor" | "viewer" | null,
) {
	if (ownerId === userId) {
		return "owner" as const;
	}
	if (!membershipRole) {
		throw new Error("Accessible course has no access role.");
	}
	return membershipRole;
}

export function createCourseAccess(db: CourseAccessExecutor) {
	async function findCourse(userId: string, id: string) {
		const [result] = await db
			.select({ course: courses, membershipRole: courseMembers.role })
			.from(courses)
			.leftJoin(
				courseMembers,
				and(
					eq(courseMembers.courseId, courses.id),
					eq(courseMembers.userId, userId),
				),
			)
			.where(eq(courses.id, id))
			.limit(1);
		if (!result) {
			return undefined;
		}

		return result;
	}

	return {
		async lock(courseId: string) {
			const [course] = await db
				.select({ id: courses.id })
				.from(courses)
				.where(eq(courses.id, courseId))
				.limit(1)
				.for("update", { of: courses });
			return course;
		},

		async findViewable(userId: string, courseId: string) {
			const result = await findCourse(userId, courseId);
			if (
				!result ||
				!canViewCourse(userId, {
					ownerId: result.course.ownerId,
					membershipRole: result.membershipRole,
				})
			) {
				return undefined;
			}
			return {
				...result.course,
				accessRole: accessRole(
					userId,
					result.course.ownerId,
					result.membershipRole,
				),
			};
		},

		async requireEditable(userId: string, courseId: string) {
			const result = await findCourse(userId, courseId);
			if (
				!result ||
				!canEditCourse(userId, {
					ownerId: result.course.ownerId,
					membershipRole: result.membershipRole,
				})
			) {
				throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
			}
			return {
				...result.course,
				accessRole: accessRole(
					userId,
					result.course.ownerId,
					result.membershipRole,
				),
			};
		},

		async requireManageable(userId: string, courseId: string) {
			const result = await findCourse(userId, courseId);
			if (
				!result ||
				!canManageCourseMembers(userId, {
					ownerId: result.course.ownerId,
					membershipRole: result.membershipRole,
				})
			) {
				throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
			}
			return { ...result.course, accessRole: "owner" as const };
		},
	};
}
