import { z } from "zod";
import { titleSchema } from "../../shared/domain/title.js";

export const lessonIdSchema = z.object({ lessonId: z.uuid() });
export const createLessonSchema = z.object({ title: titleSchema });
export const reorderLessonsSchema = z.object({
	lessonIds: z
		.array(z.uuid())
		.refine((ids) => new Set(ids).size === ids.length, {
			message: "Lesson IDs must be unique.",
		}),
});
export const updateLessonSchema = z
	.object({
		title: titleSchema.optional(),
		markdown: z.string().optional(),
		themeId: z.enum(["minimal", "academic", "dark"]).optional(),
	})
	.refine((input) => Object.keys(input).length > 0, {
		message: "At least one field is required.",
	});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
