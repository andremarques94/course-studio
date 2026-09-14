import { z } from "zod";

export const TITLE_MAX_LENGTH = 80;

export const titleSchema = z
	.string()
	.trim()
	.min(1, "A title is required.")
	.max(
		TITLE_MAX_LENGTH,
		`Titles must be ${TITLE_MAX_LENGTH} characters or fewer.`,
	);

export const createTitleInputSchema = z.object({
	title: titleSchema,
});

export const invitationRoleSchema = z.enum(["editor", "viewer"]);

export function normalizeInvitationEmail(email: string) {
	return email.trim().toLowerCase();
}

export const normalizedEmailSchema = z
	.string()
	.transform(normalizeInvitationEmail)
	.pipe(z.email("Enter a valid email address."));

export const createInvitationInputSchema = z.object({
	email: normalizedEmailSchema,
	role: invitationRoleSchema,
});
