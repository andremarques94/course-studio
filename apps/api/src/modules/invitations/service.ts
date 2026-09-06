import {
	courseInvitations,
	courseMembers,
	courses,
	type Database,
	user,
} from "@course-studio/db";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { ApiError } from "#api/http/errors/api-error";
import { createCourseAccess } from "#api/modules/courses/access";
import type { CourseInvitationDelivery } from "#api/modules/invitations/email";
import type { CreateInvitationInput } from "#api/modules/invitations/schema";
import {
	createInvitationToken,
	createInvitationUrl,
	hashInvitationToken,
} from "#api/modules/invitations/token";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

const invitationSelection = {
	id: courseInvitations.id,
	courseId: courseInvitations.courseId,
	email: courseInvitations.email,
	role: courseInvitations.role,
	invitedBy: courseInvitations.invitedBy,
	expiresAt: courseInvitations.expiresAt,
	createdAt: courseInvitations.createdAt,
};

function invalidInvitation(): never {
	throw new ApiError(
		400,
		"INVALID_INVITATION",
		"This invitation is invalid or no longer available.",
	);
}

export function createInvitationsService(
	db: Database,
	options: {
		webOrigin: string;
		sendInvitation: CourseInvitationDelivery;
	},
) {
	const access = createCourseAccess(db);

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
			const [existingUser] = await db
				.select({ id: user.id })
				.from(user)
				.where(sql`lower(${user.email}) = ${input.email}`)
				.limit(1);

			if (existingUser) {
				if (existingUser.id === course.ownerId) {
					throw new ApiError(
						400,
						"INVALID_INVITEE",
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
						"INVALID_INVITEE",
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
					email: input.email,
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

		async accept(
			userId: string,
			userEmail: string,
			emailVerified: boolean,
			token: string,
		) {
			const tokenHash = hashInvitationToken(token);
			const normalizedEmail = userEmail.trim().toLowerCase();
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

export type InvitationsService = ReturnType<typeof createInvitationsService>;
