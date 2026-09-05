import type { Context } from "hono";

export function validationHook(
	result: { success: boolean; error?: { issues: readonly unknown[] } },
	c: Context,
) {
	if (!result.success) {
		return c.json(
			{
				error: {
					code: "VALIDATION_ERROR" as const,
					message: "Request validation failed.",
					issues: result.error?.issues ?? [],
				},
			},
			400,
		);
	}
}
