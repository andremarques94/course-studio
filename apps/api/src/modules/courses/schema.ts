import { createTitleInputSchema } from "@course-studio/validation";
import { z } from "zod";

export const courseIdSchema = z.object({ courseId: z.uuid() });
export const createCourseSchema = createTitleInputSchema;
export const updateCourseSchema = createTitleInputSchema;

export type CreateCourseInput = z.infer<typeof createTitleInputSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
