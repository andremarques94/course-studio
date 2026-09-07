import {
	courseInvitations,
	courseMembers,
	type Database,
	user,
} from "@course-studio/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { ApiError } from "#api/http/errors/api-error";
import type { createCourseAccess } from "#api/modules/courses/access";
import type { CourseInvitationDelivery } from "#api/modules/invitations/email";
import type { CreateInvitationInput } from "#api/modules/invitations/schema";
import {
	invitationLifetimeMs,
	invitationSelection,
	normalizeInvitationEmail,
} from "#api/modules/invitations/service/shared";
import {
	createInvitationToken,
	createInvitationUrl,
} from "#api/modules/invitations/token";

type CourseAccess = ReturnType<typeof createCourseAccess>;

export function createPendingInvitations(
	db: Database,
	access: CourseAccess,
	options: { webOrigin: string; sendInvitation: CourseInvitationDelivery },
) {
	async function deliver(
		invitation: { email: string; role: "editor" | "viewer" },
		courseTitle: string,
		token: string,
	) {
		await options.sendInvitation({
			to: invitation.email,
			url: createInvitationUrl(options.webOrigin, token),
			courseTitle,
			role: invitation.role,
		});
	}

	return {
		async listPending(userId: string, courseId: string) {
			await access.requireManageable(userId, courseId);
			return db
				.select(invitationSelection)
				.from(courseInvitations)
				.where(
					and(
						eq(courseInvitations.courseId, courseId),
						isNull(courseInvitations.acceptedAt),
						isNull(courseInvitations.revokedAt),
					),
				);
		},

		async create(
			userId: string,
			courseId: string,
			input: CreateInvitationInput,
		) {
			const course = await access.requireManageable(userId, courseId);
			const email = normalizeInvitationEmail(input.email);
			const [existingUser] = await db
				.select({ id: user.id })
				.from(user)
				.where(sql`lower(${user.email}) = ${email}`)
				.limit(1);

			if (existingUser) {
				if (existingUser.id === course.ownerId) {
					throw new ApiError(
						400,
						"ALREADY_HAS_ACCESS",
						"This user already has access.",
					);
				}
				const [member] = await db
					.select({ userId: courseMembers.userId })
					.from(courseMembers)
					.where(
						and(
							eq(courseMembers.courseId, courseId),
							eq(courseMembers.userId, existingUser.id),
						),
					)
					.limit(1);
				if (member) {
					throw new ApiError(
						400,
						"ALREADY_HAS_ACCESS",
						"This user already has access.",
					);
				}
			}

			const { token, tokenHash } = createInvitationToken();
			const expiresAt = new Date(Date.now() + invitationLifetimeMs);
			const [invitation] = await db
				.insert(courseInvitations)
				.values({
					courseId,
					email,
					role: input.role,
					tokenHash,
					invitedBy: userId,
					expiresAt,
				})
				.onConflictDoUpdate({
					target: [courseInvitations.courseId, courseInvitations.email],
					targetWhere: sql`${courseInvitations.acceptedAt} is null and ${courseInvitations.revokedAt} is null`,
					set: { role: input.role, tokenHash, invitedBy: userId, expiresAt },
				})
				.returning(invitationSelection);
			if (!invitation) {
				throw new Error("Invitation insert returned no row.");
			}

			await deliver(invitation, course.title, token);
			return invitation;
		},

		async resend(userId: string, courseId: string, invitationId: string) {
			const course = await access.requireManageable(userId, courseId);
			const { token, tokenHash } = createInvitationToken();
			const [invitation] = await db
				.update(courseInvitations)
				.set({
					tokenHash,
					expiresAt: new Date(Date.now() + invitationLifetimeMs),
				})
				.where(
					and(
						eq(courseInvitations.id, invitationId),
						eq(courseInvitations.courseId, courseId),
						isNull(courseInvitations.acceptedAt),
						isNull(courseInvitations.revokedAt),
					),
				)
				.returning(invitationSelection);
			if (!invitation) {
				throw new ApiError(
					404,
					"INVITATION_NOT_FOUND",
					"Invitation not found.",
				);
			}

			await deliver(invitation, course.title, token);
			return invitation;
		},

		async revoke(userId: string, courseId: string, invitationId: string) {
			await access.requireManageable(userId, courseId);
			const [invitation] = await db
				.update(courseInvitations)
				.set({ revokedAt: new Date() })
				.where(
					and(
						eq(courseInvitations.id, invitationId),
						eq(courseInvitations.courseId, courseId),
						isNull(courseInvitations.acceptedAt),
						isNull(courseInvitations.revokedAt),
					),
				)
				.returning({ id: courseInvitations.id });
			if (!invitation) {
				throw new ApiError(
					404,
					"INVITATION_NOT_FOUND",
					"Invitation not found.",
				);
			}
		},
	};
}
