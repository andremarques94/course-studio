import { randomUUID } from "node:crypto";
import type { Session } from "@course-studio/auth";
import type { MiddlewareHandler } from "hono";
import type { Logger } from "../../infrastructure/logger.js";

export type AppEnv = {
	Variables: {
		requestId: string;
		session: Session;
	};
};

export function createRequestLogger(logger: Logger): MiddlewareHandler<AppEnv> {
	return async (context, next) => {
		const requestId = randomUUID();
		const startedAt = performance.now();

		context.set("requestId", requestId);
		context.header("X-Request-Id", requestId);
		await next();

		logger.info(
			{
				event: "http.request.completed",
				requestId,
				method: context.req.method,
				path: context.req.path,
				status: context.res.status,
				durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
			},
			"Request completed",
		);
	};
}
