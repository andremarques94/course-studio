import type { z } from "zod";
import type { lessonSchema } from "./schemas";

export type Lesson = z.infer<typeof lessonSchema>;
