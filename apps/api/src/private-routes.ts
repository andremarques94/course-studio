import type { Auth } from "@course-studio/auth";
import type { Database } from "@course-studio/db";
import { Hono } from "hono";
import type { AppEnv } from "#api/http/context";
import { createRequireAuth } from "#api/http/middleware/require-auth";
import { createRequireTrustedOrigin } from "#api/http/middleware/require-trusted-origin";
import { createCoursesRoutes } from "#api/modules/courses/routes";
import { createCoursesService } from "#api/modules/courses/service";
import { createLessonsRoutes } from "#api/modules/lessons/routes";
import { createLessonsService } from "#api/modules/lessons/service";

export function createPrivateRoutes(
	db: Database,
	options: { auth: Auth; trustedOrigins: string[] },
) {
	const lessonsService = createLessonsService(db);
	const requireTrustedOrigin = createRequireTrustedOrigin(
		options.trustedOrigins,
	);
	const requireAuth = createRequireAuth(options.auth);

	return new Hono<AppEnv>()
		.use("*", requireTrustedOrigin)
		.use("*", requireAuth)
		.route(
			"/courses",
			createCoursesRoutes(createCoursesService(db), lessonsService),
		)
		.route("/lessons", createLessonsRoutes(lessonsService));
}
