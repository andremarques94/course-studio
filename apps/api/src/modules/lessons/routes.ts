import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AppEnv } from "#api/http/context";
import { ApiError } from "#api/http/errors/api-error";
import { validationHook } from "#api/http/validation";
import {
	lessonIdSchema,
	updateLessonSchema,
} from "#api/modules/lessons/schema";
import type { LessonsService } from "#api/modules/lessons/service";

export function createLessonsRoutes(lessonsService: LessonsService) {
	return new Hono<AppEnv>()
		.get(
			"/:lessonId",
			zValidator("param", lessonIdSchema, validationHook),
			async (c) => {
				const lesson = await lessonsService.findById(
					c.get("session").user.id,
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
						c.get("session").user.id,
						c.req.valid("param").lessonId,
						c.req.valid("json"),
					),
				),
		)
		.delete(
			"/:lessonId",
			zValidator("param", lessonIdSchema, validationHook),
			async (c) => {
				await lessonsService.delete(
					c.get("session").user.id,
					c.req.valid("param").lessonId,
				);
				return c.body(null, 204);
			},
		);
}
