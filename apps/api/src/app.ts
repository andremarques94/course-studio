import type { Database } from "@course-studio/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Logger } from "./infrastructure/logger.js";
import { createCoursesRoutes } from "./modules/courses/course.routes.js";
import { createCoursesService } from "./modules/courses/course.service.js";
import { createHealthRoutes } from "./modules/health/health.routes.js";
import { createHealthService } from "./modules/health/health.service.js";
import { createLessonsRoutes } from "./modules/lessons/lesson.routes.js";
import { createLessonsService } from "./modules/lessons/lesson.service.js";
import { ApiError } from "./shared/http/errors.js";
import {
	type AppEnv,
	createRequestLogger,
} from "./shared/http/request-logger.js";

interface AppOptions {
	corsOrigins: string[];
	logger: Logger;
}

export function createApp(db: Database, options: AppOptions) {
	const coursesService = createCoursesService(db);
	const lessonsService = createLessonsService(db);
	const healthService = createHealthService(db);
	const corsOrigin = options.corsOrigins.includes("*")
		? "*"
		: options.corsOrigins;
	const app = new Hono<AppEnv>()
		.use("*", createRequestLogger(options.logger))
		.use(
			"*",
			cors({
				origin: corsOrigin,
				exposeHeaders: ["X-Request-Id"],
				maxAge: 86_400,
			}),
		)
		.route("/", createHealthRoutes(healthService))
		.route("/courses", createCoursesRoutes(coursesService, lessonsService))
		.route("/lessons", createLessonsRoutes(lessonsService));

	app.notFound((c) =>
		c.json(
			{ error: { code: "NOT_FOUND" as const, message: "Route not found." } },
			404,
		),
	);
	app.onError((error, c) => {
		if (error instanceof ApiError) {
			return c.json(
				{ error: { code: error.code, message: error.message } },
				error.status,
			);
		}

		options.logger.error(
			{
				event: "http.request.failed",
				requestId: c.get("requestId"),
				method: c.req.method,
				path: c.req.path,
				err: error,
			},
			"Request failed",
		);
		return c.json(
			{
				error: {
					code: "INTERNAL_ERROR" as const,
					message: "An unexpected error occurred.",
				},
			},
			500,
		);
	});

	return app;
}

export type AppType = ReturnType<typeof createApp>;
