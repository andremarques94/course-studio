import { type BuiltinThemeId, isBuiltinThemeId } from "@course-studio/themes";
import { z } from "zod";
import { entityDateSchema, titleSchema } from "@/features/courses/schemas";

const themeIdSchema = z.custom<BuiltinThemeId>(
	isBuiltinThemeId,
	"A valid presentation theme is required.",
);

export const lessonSchema = z.object({
	id: z.string().min(1),
	courseId: z.string().min(1),
	title: titleSchema,
	slug: z.string().min(1),
	markdown: z.string(),
	themeId: themeIdSchema,
	position: z.int().nonnegative(),
	createdAt: entityDateSchema,
	updatedAt: entityDateSchema,
});

export const lessonsSchema = z.array(lessonSchema);

export const updateLessonInputSchema = lessonSchema
	.pick({ title: true, markdown: true, themeId: true })
	.partial();
