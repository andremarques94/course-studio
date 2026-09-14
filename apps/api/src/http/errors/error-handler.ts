import type { Context } from "hono";
import type { AppEnv } from "#api/http/context";
import { ApiError } from "#api/http/errors/api-error";
import type { Logger } from "#api/logger";
import {
	InvitationDeliveryError,
	InvitationRateLimitError,
} from "#api/modules/invitations/errors";

export function createAppErrorHandler(logger: Logger) {
	return (error: Error, context: Context<AppEnv>) => {
		if (error instanceof InvitationRateLimitError) {
			context.header("Retry-After", String(error.retryAfterSeconds));
			return context.json(
				{ error: { code: "INVITATION_RATE_LIMITED", message: error.message } },
				429,
			);
		}
		if (error instanceof InvitationDeliveryError) {
			logger.error(
				{
					event: "invitation.delivery.failed",
					requestId: context.get("requestId"),
					method: context.req.method,
					path: context.req.path,
					diagnostic: safeDeliveryDiagnostic(error.cause),
				},
				"Invitation delivery failed",
			);
			return context.json(
				{
					error: { code: "INVITATION_DELIVERY_FAILED", message: error.message },
				},
				502,
			);
		}

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

function safeDeliveryDiagnostic(cause: unknown) {
	if (!(cause instanceof Error)) {
		return { name: "UnknownDeliveryError" };
	}
	return {
		name:
			safeDiagnosticValue(cause.name, /^[A-Za-z][A-Za-z0-9_.]{0,63}$/) ??
			"Error",
		code: safeDiagnosticValue(
			"code" in cause ? cause.code : undefined,
			/^[A-Z][A-Z0-9_]{0,63}$/,
		),
		command: safeDiagnosticValue(
			"command" in cause ? cause.command : undefined,
			/^[A-Z]{2,16}$/,
		),
		responseCode:
			"responseCode" in cause && typeof cause.responseCode === "number"
				? cause.responseCode
				: undefined,
		errno: safeDiagnosticValue(
			"errno" in cause ? cause.errno : undefined,
			/^-?[A-Z0-9_]{1,32}$/,
		),
		syscall: safeDiagnosticValue(
			"syscall" in cause ? cause.syscall : undefined,
			/^[a-z][a-z0-9_]{0,31}$/,
		),
	};
}

function safeDiagnosticValue(value: unknown, pattern: RegExp) {
	return typeof value === "string" && pattern.test(value) ? value : undefined;
}
