import { courseMembers, type Database, user } from "@course-studio/db";
import { and, eq } from "drizzle-orm";
import { ApiError } from "#api/http/errors/api-error";
import { createCourseAccess } from "#api/modules/courses/access";

type CourseAccess = ReturnType<typeof createCourseAccess>;

export function createInvitationMembers(db: Database, access: CourseAccess) {
	return {
		async listMembers(userId: string, courseId: string) {
			await access.requireManageable(userId, courseId);
			return db
				.select({
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
					role: courseMembers.role,
				})
				.from(courseMembers)
				.innerJoin(user, eq(courseMembers.userId, user.id))
				.where(eq(courseMembers.courseId, courseId));
		},

		async removeMember(userId: string, courseId: string, memberId: string) {
			return db.transaction(async (tx) => {
				const transactionAccess = createCourseAccess(tx);
				await transactionAccess.lock(courseId);
				await transactionAccess.requireManageable(userId, courseId);
				const [member] = await tx
					.delete(courseMembers)
					.where(
						and(
							eq(courseMembers.courseId, courseId),
							eq(courseMembers.userId, memberId),
						),
					)
					.returning({ userId: courseMembers.userId });
				if (!member) {
					throw new ApiError(404, "MEMBER_NOT_FOUND", "Member not found.");
				}
			});
		},
	};
}
