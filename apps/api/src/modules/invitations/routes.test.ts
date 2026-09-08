import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Hono } from "hono";
import type { AppEnv } from "#api/http/context";
import type { Logger } from "#api/logger";
import { InvitationDeliveryError } from "#api/modules/invitations/errors";
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
	const service = {
		create() {
			throw new InvitationDeliveryError("Email could not be sent.", { cause });
		},
	} as unknown as InvitationsService;
	const app = new Hono<AppEnv>()
		.use("*", async (context, next) => {
			context.set("requestId", "request-123");
			context.set("session", { user: { id: "owner-123" } } as never);
			await next();
		})
		.route("/courses", createCourseInvitationRoutes(service, logger));

	const response = await app.request(`/courses/${randomUUID()}/invitations`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "person@example.com", role: "viewer" }),
	});

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
