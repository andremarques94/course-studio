import type { z } from "zod";
import type { lessonSchema, lessonSummarySchema } from "./schemas";

export type Lesson = z.infer<typeof lessonSchema>;
export type LessonSummary = z.infer<typeof lessonSummarySchema>;
