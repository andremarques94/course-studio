import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppEnv } from "#api/http/context";
import { validationHook } from "#api/http/validation";
import type { Logger } from "#api/logger";
import { courseIdSchema } from "#api/modules/courses/schema";
import {
	InvitationDeliveryError,
	InvitationRateLimitError,
} from "#api/modules/invitations/errors";
import {
	acceptInvitationSchema,
	createInvitationSchema,
	invitationIdSchema,
	memberIdSchema,
} from "#api/modules/invitations/schema";
import type { InvitationsService } from "#api/modules/invitations/service/index";

export function createCourseInvitationRoutes(
	service: InvitationsService,
	logger: Logger,
) {
	return new Hono<AppEnv>()
		.get(
			"/:courseId/members",
			zValidator("param", courseIdSchema, validationHook),
			async (c) =>
				c.json(
					await service.listMembers(
						c.get("session").user.id,
						c.req.valid("param").courseId,
					),
				),
		)
		.delete(
			"/:courseId/members/:memberId",
			zValidator("param", courseIdSchema.and(memberIdSchema), validationHook),
			async (c) => {
				const { courseId, memberId } = c.req.valid("param");
				await service.removeMember(
					c.get("session").user.id,
					courseId,
					memberId,
				);
				return c.body(null, 204);
			},
		)
		.get(
			"/:courseId/invitations",
			zValidator("param", courseIdSchema, validationHook),
			async (c) =>
				c.json(
					await service.listPending(
						c.get("session").user.id,
						c.req.valid("param").courseId,
					),
				),
		)
		.post(
			"/:courseId/invitations",
			zValidator("param", courseIdSchema, validationHook),
			zValidator("json", createInvitationSchema, validationHook),
			async (c) => {
				try {
					return c.json(
						await service.create(
							c.get("session").user.id,
							c.req.valid("param").courseId,
							c.req.valid("json"),
						),
						201,
					);
				} catch (error) {
					return invitationOperationError(c, error, logger);
				}
			},
		)
		.post(
			"/:courseId/invitations/:invitationId/resend",
			zValidator(
				"param",
				courseIdSchema.and(invitationIdSchema),
				validationHook,
			),
			async (c) => {
				const { courseId, invitationId } = c.req.valid("param");
				try {
					return c.json(
						await service.resend(
							c.get("session").user.id,
							courseId,
							invitationId,
						),
					);
				} catch (error) {
					return invitationOperationError(c, error, logger);
				}
			},
		)
		.delete(
			"/:courseId/invitations/:invitationId",
			zValidator(
				"param",
				courseIdSchema.and(invitationIdSchema),
				validationHook,
			),
			async (c) => {
				const { courseId, invitationId } = c.req.valid("param");
				await service.revoke(c.get("session").user.id, courseId, invitationId);
				return c.body(null, 204);
			},
		);
}

function invitationOperationError(
	c: Context<AppEnv>,
	error: unknown,
	logger: Logger,
) {
	if (error instanceof InvitationRateLimitError) {
		c.header("Retry-After", String(error.retryAfterSeconds));
		return c.json(
			{ error: { code: "INVITATION_RATE_LIMITED", message: error.message } },
			429,
		);
	}
	if (error instanceof InvitationDeliveryError) {
		logger.error(
			{
				event: "invitation.delivery.failed",
				requestId: c.get("requestId"),
				method: c.req.method,
				path: c.req.path,
				diagnostic: safeDeliveryDiagnostic(error.cause),
			},
			"Invitation delivery failed",
		);
		return c.json(
			{ error: { code: "INVITATION_DELIVERY_FAILED", message: error.message } },
			502,
		);
	}
	throw error;
}

function safeDeliveryDiagnostic(cause: unknown) {
	if (!(cause instanceof Error)) {
		return { name: "UnknownDeliveryError" };
	}
	const source = cause as Error & Record<string, unknown>;
	return {
		name:
			safeDiagnosticValue(cause.name, /^[A-Za-z][A-Za-z0-9_.]{0,63}$/) ??
			"Error",
		code: safeDiagnosticValue(source.code, /^[A-Z][A-Z0-9_]{0,63}$/),
		command: safeDiagnosticValue(source.command, /^[A-Z]{2,16}$/),
		responseCode:
			typeof source.responseCode === "number" ? source.responseCode : undefined,
		errno: safeDiagnosticValue(source.errno, /^-?[A-Z0-9_]{1,32}$/),
		syscall: safeDiagnosticValue(source.syscall, /^[a-z][a-z0-9_]{0,31}$/),
	};
}

function safeDiagnosticValue(value: unknown, pattern: RegExp) {
	return typeof value === "string" && pattern.test(value) ? value : undefined;
}

export function createInvitationAcceptanceRoutes(service: InvitationsService) {
	return new Hono<AppEnv>().post(
		"/accept",
		zValidator("json", acceptInvitationSchema, validationHook),
		async (c) => {
			const session = c.get("session");
			return c.json(
				await service.accept(
					session.user.id,
					session.user.email,
					session.user.emailVerified,
					c.req.valid("json").token,
				),
			);
		},
	);
}
