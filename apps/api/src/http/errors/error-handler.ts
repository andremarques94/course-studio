import type { Context } from "hono";
import type { AppEnv } from "#api/http/context";
import { ApiError } from "#api/http/errors/api-error";
import type { Logger } from "#api/logger";

export function createAppErrorHandler(logger: Logger) {
	return (error: Error, context: Context<AppEnv>) => {
		if (error instanceof ApiError) {
			return context.json(
				{ error: { code: error.code, message: error.message } },
				error.status,
			);
		}

		logger.error(
			{
				event: "http.request.failed",
				requestId: context.get("requestId"),
				method: context.req.method,
				path: context.req.path,
				err: error,
			},
			"Request failed",
		);
		return context.json(
			{
				error: {
					code: "INTERNAL_ERROR" as const,
					message: "An unexpected error occurred.",
				},
			},
			500,
		);
	};
}
