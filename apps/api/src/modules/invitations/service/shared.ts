import { courseInvitations } from "@course-studio/db";
import { ApiError } from "#api/http/errors/api-error";

export const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export const invitationSelection = {
	id: courseInvitations.id,
	courseId: courseInvitations.courseId,
	email: courseInvitations.email,
	role: courseInvitations.role,
	invitedBy: courseInvitations.invitedBy,
	expiresAt: courseInvitations.expiresAt,
	createdAt: courseInvitations.createdAt,
};

export function invalidInvitation(): never {
	throw new ApiError(
		400,
		"INVALID_INVITATION",
		"This invitation is invalid or no longer available.",
	);
}

export function normalizeInvitationEmail(email: string) {
	return email.trim().toLowerCase();
}
