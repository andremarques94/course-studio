import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import type { AppEnv } from "#api/http/context";
import { validationHook } from "#api/http/validation";
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

export function createCourseInvitationRoutes(service: InvitationsService) {
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
					return invitationOperationError(c, error);
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
					return invitationOperationError(c, error);
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

function invitationOperationError(c: Context<AppEnv>, error: unknown) {
	if (error instanceof InvitationRateLimitError) {
		c.header("Retry-After", String(error.retryAfterSeconds));
		return c.json(
			{ error: { code: "INVITATION_RATE_LIMITED", message: error.message } },
			429,
		);
	}
	if (error instanceof InvitationDeliveryError) {
		return c.json(
			{ error: { code: "INVITATION_DELIVERY_FAILED", message: error.message } },
			502,
		);
	}
	throw error;
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
