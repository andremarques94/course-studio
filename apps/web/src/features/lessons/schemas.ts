import { type BuiltinThemeId, isBuiltinThemeId } from "@course-studio/themes";
import { z } from "zod";
import { entityDateSchema, titleSchema } from "@/features/courses/schemas";

const themeIdSchema = z.custom<BuiltinThemeId>(
	isBuiltinThemeId,
	"A valid presentation theme is required.",
);

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

export const lessonSchema = lessonSummarySchema.extend({
	markdown: z.string(),
	themeId: themeIdSchema,
});

export const lessonSummariesSchema = z.array(lessonSummarySchema);

export const updateLessonInputSchema = lessonSummarySchema
	.pick({ title: true })
	.partial();
