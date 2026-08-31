import type { z } from "zod";
import type { courseSchema } from "./schemas";

export type Course = z.infer<typeof courseSchema>;
