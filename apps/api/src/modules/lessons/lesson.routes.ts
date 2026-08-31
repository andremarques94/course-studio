import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ApiError } from "../../shared/http/errors.js";
import { validationHook } from "../../shared/http/validation.js";
import { lessonIdSchema, updateLessonSchema } from "./lesson.schema.js";
import type { LessonsService } from "./lesson.service.js";

export function createLessonsRoutes(lessonsService: LessonsService) {
	return new Hono()
		.get(
			"/:lessonId",
			zValidator("param", lessonIdSchema, validationHook),
			async (c) => {
				const lesson = await lessonsService.findById(
					c.req.valid("param").lessonId,
				);
				if (!lesson) {
					throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found.");
				}
				return c.json(lesson);
			},
		)
		.patch(
			"/:lessonId",
			zValidator("param", lessonIdSchema, validationHook),
			zValidator("json", updateLessonSchema, validationHook),
			async (c) =>
				c.json(
					await lessonsService.update(
						c.req.valid("param").lessonId,
						c.req.valid("json"),
					),
				),
		)
		.delete(
			"/:lessonId",
			zValidator("param", lessonIdSchema, validationHook),
			async (c) => {
				await lessonsService.delete(c.req.valid("param").lessonId);
				return c.body(null, 204);
			},
		);
}
