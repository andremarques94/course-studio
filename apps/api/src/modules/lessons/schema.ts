import { lessons } from "@course-studio/db";
import { z } from "zod";
import { titleSchema } from "#api/content-naming";

export const lessonSummaryColumns = {
	id: lessons.id,
	courseId: lessons.courseId,
	title: lessons.title,
	slug: lessons.slug,
	position: lessons.position,
	createdAt: lessons.createdAt,
	updatedAt: lessons.updatedAt,
};

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
	})
	.strict()
	.refine((input) => Object.keys(input).length > 0, {
		message: "At least one field is required.",
	});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
