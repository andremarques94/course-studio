import type { z } from "zod";
import type {
	accessRoleSchema,
	courseInvitationSchema,
	courseMemberSchema,
	courseSchema,
	invitationRoleSchema,
} from "./schemas";

export type Course = z.infer<typeof courseSchema>;
export type AccessRole = z.infer<typeof accessRoleSchema>;
export type InvitationRole = z.infer<typeof invitationRoleSchema>;
export type CourseMember = z.infer<typeof courseMemberSchema>;
export type CourseInvitation = z.infer<typeof courseInvitationSchema>;
