import { createAuth } from "@course-studio/auth";
import { createDatabase } from "@course-studio/db";
import { serve } from "@hono/node-server";
import { createApp } from "#api/app";
import { createSmtpEmailSender } from "#api/email";
import { loadEnv } from "#api/env";
import { createLogger } from "#api/logger";
import { createCourseInvitationDelivery } from "#api/modules/invitations/email";
import { createVerificationEmailSender } from "#api/verification-email";

const env = loadEnv();
const logger = createLogger(env.logLevel);
const db = createDatabase(env.databaseUrl);
const sendVerificationEmail = createVerificationEmailSender(env);
const sendEmail = createSmtpEmailSender(env);
if (!sendEmail && env.nodeEnv === "production") {
	throw new Error("Course invitations require SMTP in production.");
}
const auth = createAuth(db, {
	baseURL: env.betterAuthUrl,
	github: env.github,
	google: env.google,
	secret: env.betterAuthSecret,
	trustedOrigins: env.trustedOrigins,
	sendVerificationEmail,
});
const app = createApp(db, {
	auth,
	corsOrigins: env.trustedOrigins,
	logger,
	webOrigin: env.webOrigin,
	sendCourseInvitation: sendEmail
		? createCourseInvitationDelivery(sendEmail)
		: async ({ url }) => {
				// Development fallback only. Production startup requires SMTP above.
				logger.info(
					{ event: "api.dev.invitation-link", url },
					"Development course invitation link",
				);
			},
});

const server = serve(
	{
		fetch: app.fetch,
		port: env.apiPort,
	},
	(info) => {
		logger.info(
			{ event: "api.started", port: info.port, environment: env.nodeEnv },
			"API started",
		);
	},
);

let isShuttingDown = false;

function shutdown() {
	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;
	logger.info({ event: "api.stopping" }, "API stopping");
	server.close(async () => {
		try {
			await db.$client.end();
			logger.info({ event: "api.stopped" }, "API stopped");
		} catch (error) {
			logger.error(
				{ event: "api.shutdown.failed", err: error },
				"API shutdown failed",
			);
			process.exitCode = 1;
		}
	});
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

export type { AppType } from "#api/app";
