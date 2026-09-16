import { BUILTIN_THEME_IDS } from "@course-studio/themes/ids";
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

export const invitationTokenSchema = z
	.string()
	.regex(/^[A-Za-z0-9_-]{43}$/, "Invalid invitation token.");

export const renameLessonInputSchema = createTitleInputSchema.strict();

export const reorderLessonsInputSchema = z.object({
	lessonIds: z
		.array(z.uuid())
		.refine((ids) => new Set(ids).size === ids.length, {
			message: "Lesson IDs must be unique.",
		}),
});

export const themeIdSchema = z.enum(
	BUILTIN_THEME_IDS,
	"A valid presentation theme is required.",
);
export const lessonContentSchema = z.object({
	markdown: z.string(),
	themeId: themeIdSchema,
});

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

export const lessonSummarySchema = z
	.object({
		id: z.string().min(1),
		courseId: z.string().min(1),
		title: titleSchema,
		slug: z.string().min(1),
		position: z.int().nonnegative(),
		createdAt: entityDateSchema,
		updatedAt: entityDateSchema,
	})
	.strict();

export const lessonSchema = lessonSummarySchema.extend(
	lessonContentSchema.shape,
);

export const lessonSummariesSchema = z.array(lessonSummarySchema);
