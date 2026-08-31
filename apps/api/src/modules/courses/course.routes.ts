import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ApiError } from "../../shared/http/errors.js";
import { validationHook } from "../../shared/http/validation.js";
import { createLessonSchema } from "../lessons/lesson.schema.js";
import type { LessonsService } from "../lessons/lesson.service.js";
import {
	courseIdSchema,
	createCourseSchema,
	updateCourseSchema,
} from "./course.schema.js";
import type { CoursesService } from "./course.service.js";

export function createCoursesRoutes(
	coursesService: CoursesService,
	lessonsService: LessonsService,
) {
	return new Hono()
		.get("/", async (c) => c.json(await coursesService.findAll()))
		.post(
			"/",
			zValidator("json", createCourseSchema, validationHook),
			async (c) =>
				c.json(await coursesService.create(c.req.valid("json")), 201),
		)
		.get(
			"/:courseId",
			zValidator("param", courseIdSchema, validationHook),
			async (c) => {
				const course = await coursesService.findById(
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
						c.req.valid("param").courseId,
						c.req.valid("json"),
					),
				),
		)
		.delete(
			"/:courseId",
			zValidator("param", courseIdSchema, validationHook),
			async (c) => {
				await coursesService.delete(c.req.valid("param").courseId);
				return c.body(null, 204);
			},
		)
		.get(
			"/:courseId/lessons",
			zValidator("param", courseIdSchema, validationHook),
			async (c) => {
				const courseId = c.req.valid("param").courseId;
				const course = await coursesService.findById(courseId);
				if (!course) {
					throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
				}
				return c.json(await lessonsService.findByCourse(courseId));
			},
		)
		.post(
			"/:courseId/lessons",
			zValidator("param", courseIdSchema, validationHook),
			zValidator("json", createLessonSchema, validationHook),
			async (c) =>
				c.json(
					await lessonsService.create(
						c.req.valid("param").courseId,
						c.req.valid("json"),
					),
					201,
				),
		);
}
