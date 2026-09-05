import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AppEnv } from "#api/http/context";
import { ApiError } from "#api/http/errors/api-error";
import { validationHook } from "#api/http/validation";
import {
	courseIdSchema,
	createCourseSchema,
	updateCourseSchema,
} from "#api/modules/courses/schema";
import type { CoursesService } from "#api/modules/courses/service";
import {
	createLessonSchema,
	reorderLessonsSchema,
} from "#api/modules/lessons/schema";
import type { LessonsService } from "#api/modules/lessons/service";

export function createCoursesRoutes(
	coursesService: CoursesService,
	lessonsService: LessonsService,
) {
	return new Hono<AppEnv>()
		.get("/", async (c) =>
			c.json(await coursesService.findAll(c.get("session").user.id)),
		)
		.post(
			"/",
			zValidator("json", createCourseSchema, validationHook),
			async (c) =>
				c.json(
					await coursesService.create(
						c.get("session").user.id,
						c.req.valid("json"),
					),
					201,
				),
		)
		.get(
			"/:courseId",
			zValidator("param", courseIdSchema, validationHook),
			async (c) => {
				const course = await coursesService.findById(
					c.get("session").user.id,
					c.req.valid("param").courseId,
				);
				if (!course) {
					throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
				}
				return c.json(course);
			},
		)
		.patch(
			"/:courseId",
			zValidator("param", courseIdSchema, validationHook),
			zValidator("json", updateCourseSchema, validationHook),
			async (c) =>
				c.json(
					await coursesService.update(
						c.get("session").user.id,
						c.req.valid("param").courseId,
						c.req.valid("json"),
					),
				),
		)
		.delete(
			"/:courseId",
			zValidator("param", courseIdSchema, validationHook),
			async (c) => {
				await coursesService.delete(
					c.get("session").user.id,
					c.req.valid("param").courseId,
				);
				return c.body(null, 204);
			},
		)
		.get(
			"/:courseId/lessons",
			zValidator("param", courseIdSchema, validationHook),
			async (c) => {
				const courseId = c.req.valid("param").courseId;
				const userId = c.get("session").user.id;
				return c.json(await lessonsService.findByCourse(userId, courseId));
			},
		)
		.post(
			"/:courseId/lessons",
			zValidator("param", courseIdSchema, validationHook),
			zValidator("json", createLessonSchema, validationHook),
			async (c) =>
				c.json(
					await lessonsService.create(
						c.get("session").user.id,
						c.req.valid("param").courseId,
						c.req.valid("json"),
					),
					201,
				),
		)
		.put(
			"/:courseId/lessons/order",
			zValidator("param", courseIdSchema, validationHook),
			zValidator("json", reorderLessonsSchema, validationHook),
			async (c) =>
				c.json(
					await lessonsService.reorder(
						c.get("session").user.id,
						c.req.valid("param").courseId,
						c.req.valid("json"),
					),
				),
		);
}
