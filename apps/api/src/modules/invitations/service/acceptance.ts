import {
	courseInvitations,
	courseMembers,
	courses,
	type Database,
} from "@course-studio/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
	invalidInvitation,
	normalizeInvitationEmail,
} from "#api/modules/invitations/service/shared";
import { hashInvitationToken } from "#api/modules/invitations/token";

export function createInvitationAcceptance(db: Database) {
	return {
		async accept(
			userId: string,
			userEmail: string,
			emailVerified: boolean,
			token: string,
		) {
			const tokenHash = hashInvitationToken(token);
			const normalizedEmail = normalizeInvitationEmail(userEmail);
			return db.transaction(async (tx) => {
				const [invitation] = await tx
					.select({
						id: courseInvitations.id,
						courseId: courseInvitations.courseId,
						email: courseInvitations.email,
						role: courseInvitations.role,
						expiresAt: courseInvitations.expiresAt,
						acceptedAt: courseInvitations.acceptedAt,
						revokedAt: courseInvitations.revokedAt,
						ownerId: courses.ownerId,
					})
					.from(courseInvitations)
					.innerJoin(courses, eq(courseInvitations.courseId, courses.id))
					.where(eq(courseInvitations.tokenHash, tokenHash))
					.limit(1)
					.for("update", { of: courseInvitations });

				if (
					!emailVerified ||
					!invitation ||
					invitation.acceptedAt ||
					invitation.revokedAt ||
					invitation.expiresAt <= new Date() ||
					invitation.email !== normalizedEmail ||
					invitation.ownerId === userId
				) {
					invalidInvitation();
				}

				const [membership] = await tx
					.insert(courseMembers)
					.values({
						courseId: invitation.courseId,
						userId,
						role: invitation.role,
					})
					.onConflictDoNothing()
					.returning({ userId: courseMembers.userId });
				if (!membership) {
					invalidInvitation();
				}

				const [consumed] = await tx
					.update(courseInvitations)
					.set({ acceptedAt: new Date() })
					.where(
						and(
							eq(courseInvitations.id, invitation.id),
							isNull(courseInvitations.acceptedAt),
							isNull(courseInvitations.revokedAt),
							gt(courseInvitations.expiresAt, new Date()),
						),
					)
					.returning({ id: courseInvitations.id });
				if (!consumed) {
					invalidInvitation();
				}

				return { courseId: invitation.courseId, role: invitation.role };
			});
		},
	};
}
