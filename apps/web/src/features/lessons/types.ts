import type {
	lessonSchema,
	lessonSummarySchema,
} from "@course-studio/validation";
import type { z } from "zod";

export type Lesson = z.infer<typeof lessonSchema>;
export type LessonSummary = z.infer<typeof lessonSummarySchema>;
