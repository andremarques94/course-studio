import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "#api/http/context";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function createRequireTrustedOrigin(
	trustedOrigins: string[],
): MiddlewareHandler<AppEnv> {
	const allowedOrigins = new Set(trustedOrigins);

	return async (context, next) => {
		const origin = context.req.header("origin");
		if (
			stateChangingMethods.has(context.req.method) &&
			origin &&
			!allowedOrigins.has(origin)
		) {
			return context.json(
				{
					error: {
						code: "UNTRUSTED_ORIGIN" as const,
						message: "Request origin is not trusted.",
					},
				},
				403,
			);
		}

		await next();
	};
}
