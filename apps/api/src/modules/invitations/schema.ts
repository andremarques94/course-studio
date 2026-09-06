import { z } from "zod";

export const invitationRoleSchema = z.enum(["editor", "viewer"]);
export const normalizedEmailSchema = z
	.string()
	.trim()
	.toLowerCase()
	.pipe(z.email());

export const createInvitationSchema = z.object({
	email: normalizedEmailSchema,
	role: invitationRoleSchema,
});
export const acceptInvitationSchema = z.object({
	token: z.string().min(1).max(1024),
});
export const invitationIdSchema = z.object({ invitationId: z.uuid() });
export const memberIdSchema = z.object({ memberId: z.string().min(1) });

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
