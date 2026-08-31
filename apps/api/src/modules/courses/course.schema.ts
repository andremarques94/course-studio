import { z } from "zod";
import { titleSchema } from "../../shared/domain/title.js";

export const courseIdSchema = z.object({ courseId: z.uuid() });
export const createCourseSchema = z.object({ title: titleSchema });
export const updateCourseSchema = createCourseSchema;

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
