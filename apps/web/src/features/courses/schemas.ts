import { invitationRoleSchema, titleSchema } from "@course-studio/validation";
import { z } from "zod";

export const entityDateSchema = z.preprocess(
	(value) => (typeof value === "string" ? new Date(value) : value),
	z.date(),
);

export const accessRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const courseSchema = z.object({
	id: z.string().min(1),
	title: titleSchema,
	slug: z.string().min(1),
	createdAt: entityDateSchema,
	updatedAt: entityDateSchema,
	accessRole: accessRoleSchema,
});

export const coursesSchema = z.array(courseSchema);

export const courseMemberSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	email: z.email(),
	image: z.string().nullable(),
	role: invitationRoleSchema,
});

export const courseMembersSchema = z.array(courseMemberSchema);

export const courseInvitationSchema = z.object({
	id: z.string().min(1),
	courseId: z.string().min(1),
	email: z.email(),
	role: invitationRoleSchema,
	invitedBy: z.string().min(1),
	expiresAt: entityDateSchema,
	createdAt: entityDateSchema,
});

export const courseInvitationsSchema = z.array(courseInvitationSchema);

export const acceptInvitationResponseSchema = z.object({
	courseId: z.string().min(1),
	role: invitationRoleSchema,
});
