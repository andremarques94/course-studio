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
import { InvitationDeliveryError } from "#api/modules/invitations/errors";
import type { createInvitationRateLimiter } from "#api/modules/invitations/rate-limit";
import type { CreateInvitationInput } from "#api/modules/invitations/schema";
import { invitationSerializer } from "#api/modules/invitations/serialization";
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
type InvitationRateLimiter = ReturnType<typeof createInvitationRateLimiter>;

export function createPendingInvitations(
	db: Database,
	access: CourseAccess,
	options: {
		webOrigin: string;
		sendInvitation: CourseInvitationDelivery;
		rateLimiter: InvitationRateLimiter;
	},
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

			options.rateLimiter.consume(userId, email);
			return invitationSerializer.run(
				serializationKey(courseId, email),
				async () => {
					const { token, tokenHash } = createInvitationToken();
					const expiresAt = new Date(Date.now() + invitationLifetimeMs);
					const [inserted] = await db
						.insert(courseInvitations)
						.values({
							courseId,
							email,
							role: input.role,
							tokenHash,
							invitedBy: userId,
							expiresAt,
						})
						.onConflictDoNothing({
							target: [courseInvitations.courseId, courseInvitations.email],
							where: sql`${courseInvitations.acceptedAt} is null and ${courseInvitations.revokedAt} is null`,
						})
						.returning(invitationSelection);

					if (inserted) {
						try {
							await deliver(inserted, course.title, token);
						} catch (error) {
							throw new InvitationDeliveryError(
								"Invitation saved, but the email could not be sent. Use Resend to try again.",
								{ cause: error },
							);
						}
						return inserted;
					}

					const existing = await findPending(courseId, email);
					if (!existing) {
						throw new ApiError(
							404,
							"INVITATION_NOT_FOUND",
							"Invitation changed concurrently. Refresh and try again.",
						);
					}
					const invitation = await replaceToken(existing, {
						role: input.role,
						tokenHash,
						invitedBy: userId,
						expiresAt,
					});
					try {
						await deliver(invitation, course.title, token);
					} catch (error) {
						await restore(existing, tokenHash);
						throw new InvitationDeliveryError(
							"Email could not be sent. The existing invitation was left unchanged; try again.",
							{ cause: error },
						);
					}
					return invitation;
				},
			);
		},

		async resend(userId: string, courseId: string, invitationId: string) {
			const course = await access.requireManageable(userId, courseId);
			const existing = await findPending(courseId, undefined, invitationId);
			if (!existing) {
				throw invitationNotFound();
			}
			options.rateLimiter.consume(userId, existing.email);
			return invitationSerializer.run(
				serializationKey(courseId, existing.email),
				async () => {
					const current = await findPending(courseId, undefined, invitationId);
					if (!current) {
						throw invitationNotFound();
					}
					const { token, tokenHash } = createInvitationToken();
					const invitation = await replaceToken(current, {
						tokenHash,
						expiresAt: new Date(Date.now() + invitationLifetimeMs),
					});

					try {
						await deliver(invitation, course.title, token);
					} catch (error) {
						await restore(current, tokenHash);
						throw new InvitationDeliveryError(
							"Email could not be sent. The existing invitation remains unchanged; try again.",
							{ cause: error },
						);
					}
					return invitation;
				},
			);
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

	async function findPending(
		courseId: string,
		email?: string,
		invitationId?: string,
	) {
		const [invitation] = await db
			.select({
				...invitationSelection,
				tokenHash: courseInvitations.tokenHash,
			})
			.from(courseInvitations)
			.where(
				and(
					eq(courseInvitations.courseId, courseId),
					email ? eq(courseInvitations.email, email) : undefined,
					invitationId ? eq(courseInvitations.id, invitationId) : undefined,
					isNull(courseInvitations.acceptedAt),
					isNull(courseInvitations.revokedAt),
				),
			)
			.limit(1);
		return invitation;
	}

	async function replaceToken(
		existing: NonNullable<Awaited<ReturnType<typeof findPending>>>,
		changes: {
			role?: "editor" | "viewer";
			tokenHash: string;
			invitedBy?: string;
			expiresAt: Date;
		},
	) {
		const [invitation] = await db
			.update(courseInvitations)
			.set(changes)
			.where(
				and(
					eq(courseInvitations.id, existing.id),
					eq(courseInvitations.tokenHash, existing.tokenHash),
					isNull(courseInvitations.acceptedAt),
					isNull(courseInvitations.revokedAt),
				),
			)
			.returning(invitationSelection);
		if (!invitation) {
			throw invitationNotFound();
		}
		return invitation;
	}

	async function restore(
		existing: NonNullable<Awaited<ReturnType<typeof findPending>>>,
		failedTokenHash: string,
	) {
		await db
			.update(courseInvitations)
			.set({
				role: existing.role,
				tokenHash: existing.tokenHash,
				invitedBy: existing.invitedBy,
				expiresAt: existing.expiresAt,
			})
			.where(
				and(
					eq(courseInvitations.id, existing.id),
					eq(courseInvitations.tokenHash, failedTokenHash),
					isNull(courseInvitations.acceptedAt),
					isNull(courseInvitations.revokedAt),
				),
			);
	}
}

function invitationNotFound() {
	return new ApiError(404, "INVITATION_NOT_FOUND", "Invitation not found.");
}

function serializationKey(courseId: string, email: string) {
	return JSON.stringify([courseId, email]);
}
