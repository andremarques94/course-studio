import { z } from "zod";
import { titleSchema } from "../../shared/domain/title.js";

export const lessonIdSchema = z.object({ lessonId: z.uuid() });
export const createLessonSchema = z.object({ title: titleSchema });
export const updateLessonSchema = z
	.object({
		title: titleSchema.optional(),
		markdown: z.string().optional(),
		themeId: z.enum(["minimal", "academic", "dark"]).optional(),
		position: z.number().int().nonnegative().optional(),
	})
	.refine((input) => Object.keys(input).length > 0, {
		message: "At least one field is required.",
	});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
