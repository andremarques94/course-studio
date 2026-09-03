import type { Auth } from "@course-studio/auth";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./request-logger.js";

export function createRequireAuth(auth: Auth): MiddlewareHandler<AppEnv> {
	return async (context, next) => {
		const session = await auth.api.getSession({
			headers: context.req.raw.headers,
		});

		if (!session) {
			return context.json(
				{
					error: {
						code: "UNAUTHORIZED" as const,
						message: "Authentication required.",
					},
				},
				401,
			);
		}

		context.set("session", session);
		await next();
	};
}
