import { lessons } from "@course-studio/db";
import {
	createTitleInputSchema,
	renameLessonInputSchema,
	reorderLessonsInputSchema,
} from "@course-studio/validation";
import { z } from "zod";

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
export const createLessonSchema = createTitleInputSchema;
export const reorderLessonsSchema = reorderLessonsInputSchema;
export const updateLessonSchema = renameLessonInputSchema;

export type CreateLessonInput = z.infer<typeof createTitleInputSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
