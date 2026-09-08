import type { Auth } from "@course-studio/auth";
import type { Database } from "@course-studio/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "#api/http/context";
import { createAppErrorHandler } from "#api/http/errors/error-handler";
import { createRequestLogger } from "#api/http/middleware/request-logger";
import type { Logger } from "#api/logger";
import { createHealthRoutes } from "#api/modules/health";
import type { CourseInvitationDelivery } from "#api/modules/invitations/email";
import type { InvitationRateLimits } from "#api/modules/invitations/rate-limit";
import { createPrivateRoutes } from "#api/private-routes";

type AppOptions = {
	auth: Auth;
	corsOrigins: string[];
	logger: Logger;
	webOrigin: string;
	sendCourseInvitation: CourseInvitationDelivery;
	invitationRateLimits?: InvitationRateLimits;
};

export function createApp(db: Database, options: AppOptions) {
	const app = new Hono<AppEnv>()
		.basePath("/api")
		.use("*", createRequestLogger(options.logger))
		.use(
			"*",
			cors({
				origin: options.corsOrigins,
				credentials: true,
				exposeHeaders: ["X-Request-Id"],
				maxAge: 86_400,
			}),
		)
		.all("/auth/*", (context) => options.auth.handler(context.req.raw))
		.route("/", createHealthRoutes(db))
		.route(
			"/",
			createPrivateRoutes(db, {
				auth: options.auth,
				logger: options.logger,
				trustedOrigins: options.corsOrigins,
				webOrigin: options.webOrigin,
				sendCourseInvitation: options.sendCourseInvitation,
				invitationRateLimits: options.invitationRateLimits,
			}),
		);

	app.notFound((context) =>
		context.json(
			{ error: { code: "NOT_FOUND" as const, message: "Route not found." } },
			404,
		),
	);
	app.onError(createAppErrorHandler(options.logger));

	return app;
}

export type AppType = ReturnType<typeof createApp>;
