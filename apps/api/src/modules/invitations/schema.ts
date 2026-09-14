import { createInvitationInputSchema } from "@course-studio/validation";
import { z } from "zod";

export const createInvitationSchema = createInvitationInputSchema;

export const acceptInvitationSchema = z.object({
	token: z.string().min(1).max(1024),
});
export const invitationIdSchema = z.object({ invitationId: z.uuid() });
export const memberIdSchema = z.object({ memberId: z.string().min(1) });

export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;
