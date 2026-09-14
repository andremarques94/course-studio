import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Hono } from "hono";
import type { AppEnv } from "#api/http/context";
import { ApiError } from "#api/http/errors/api-error";
import { createAppErrorHandler } from "#api/http/errors/error-handler";
import type { Logger } from "#api/logger";
import {
	InvitationDeliveryError,
	InvitationRateLimitError,
} from "#api/modules/invitations/errors";
import { createCourseInvitationRoutes } from "#api/modules/invitations/routes";
import type { InvitationsService } from "#api/modules/invitations/service/index";

test("delivery failures return a friendly 502 and emit one safe diagnostic", async () => {
	const entries: Array<{ context: Record<string, unknown>; message: string }> =
		[];
	const logger: Logger = {
		info() {},
		error(context, message) {
			entries.push({ context, message });
		},
	};
	const cause = Object.assign(new Error("SMTP rejected person@example.com"), {
		code: "ECONNECTION",
		command: "CONN",
		responseCode: 421,
		token: "invitation-secret",
		password: "smtp-password",
		body: "private body",
	});
	const app = createTestApp(
		new InvitationDeliveryError("Email could not be sent.", { cause }),
		logger,
	);

	const response = await requestInvitation(app, "create");

	assert.equal(response.status, 502);
	assert.deepEqual(await response.json(), {
		error: {
			code: "INVITATION_DELIVERY_FAILED",
			message: "Email could not be sent.",
		},
	});
	assert.equal(entries.length, 1);
	assert.equal(entries[0]?.context.requestId, "request-123");
	assert.deepEqual(entries[0]?.context.diagnostic, {
		name: "Error",
		code: "ECONNECTION",
		command: "CONN",
		responseCode: 421,
		errno: undefined,
		syscall: undefined,
	});
	const serializedLog = JSON.stringify(entries);
	for (const secret of [
		"person@example.com",
		"invitation-secret",
		"smtp-password",
		"private body",
	]) {
		assert.doesNotMatch(serializedLog, new RegExp(secret));
	}
});

for (const operation of ["create", "resend"] as const) {
	test(`${operation} rate limits preserve Retry-After without error logging`, async () => {
		const app = createTestApp(new InvitationRateLimitError(37));
		const response = await requestInvitation(app, operation);
		assert.equal(response.status, 429);
		assert.equal(response.headers.get("Retry-After"), "37");
		assert.deepEqual(await response.json(), {
			error: {
				code: "INVITATION_RATE_LIMITED",
				message: "Too many invitation attempts. Try again in 37 seconds.",
			},
		});
	});
}

test("resend delivery failures use the same safe application handler", async () => {
	const entries: unknown[] = [];
	const app = createTestApp(
		new InvitationDeliveryError("Email could not be sent.", {
			cause: "smtp-secret",
		}),
		{
			info() {},
			error(context) {
				entries.push(context);
			},
		},
	);
	const response = await requestInvitation(app, "resend");
	assert.equal(response.status, 502);
	assert.deepEqual(await response.json(), {
		error: {
			code: "INVITATION_DELIVERY_FAILED",
			message: "Email could not be sent.",
		},
	});
	assert.equal(entries.length, 1);
	assert.doesNotMatch(JSON.stringify(entries), /smtp-secret/);
});

test("ordinary API errors retain their status and public message", async () => {
	const response = await requestInvitation(
		createTestApp(new ApiError(404, "COURSE_NOT_FOUND", "Course not found.")),
		"create",
	);
	assert.equal(response.status, 404);
	assert.deepEqual(await response.json(), {
		error: { code: "COURSE_NOT_FOUND", message: "Course not found." },
	});
});

test("unexpected errors are logged once and return a generic 500", async () => {
	const entries: unknown[] = [];
	const app = createTestApp(new Error("internal detail"), {
		info() {},
		error(context) {
			entries.push(context);
		},
	});
	const response = await requestInvitation(app, "create");
	assert.equal(response.status, 500);
	assert.deepEqual(await response.json(), {
		error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
	});
	assert.equal(entries.length, 1);
});

function createTestApp(
	error: Error,
	logger: Logger = {
		info() {},
		error() {
			assert.fail("This error should not be logged");
		},
	},
) {
	const unexpectedCall = () => {
		throw new Error("Unexpected service call");
	};
	const failOperation = () => {
		throw error;
	};
	const service: InvitationsService = {
		create: failOperation,
		resend: failOperation,
		listMembers: unexpectedCall,
		removeMember: unexpectedCall,
		listPending: unexpectedCall,
		revoke: unexpectedCall,
		accept: unexpectedCall,
	};
	const now = new Date();
	const session: AppEnv["Variables"]["session"] = {
		user: {
			id: "owner-123",
			name: "Owner",
			email: "owner@example.com",
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
		session: {
			id: "session-123",
			userId: "owner-123",
			token: "test-session-token",
			createdAt: now,
			updatedAt: now,
			expiresAt: new Date(now.getTime() + 60_000),
		},
	};
	return new Hono<AppEnv>()
		.use("*", async (context, next) => {
			context.set("requestId", "request-123");
			context.set("session", session);
			await next();
		})
		.route("/courses", createCourseInvitationRoutes(service))
		.onError(createAppErrorHandler(logger));
}

function requestInvitation(
	app: ReturnType<typeof createTestApp>,
	operation: "create" | "resend",
) {
	const path = `/courses/${randomUUID()}/invitations`;
	return app.request(
		operation === "resend" ? `${path}/${randomUUID()}/resend` : path,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "person@example.com", role: "viewer" }),
		},
	);
}
