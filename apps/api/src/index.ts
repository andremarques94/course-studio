import { createAuth } from "@course-studio/auth";
import { createDatabase } from "@course-studio/db";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createLogger } from "./infrastructure/logger.js";

const env = loadEnv();
const logger = createLogger(env.logLevel);
const db = createDatabase(env.databaseUrl);
const auth = createAuth(db, {
	baseURL: env.betterAuthUrl,
	github: env.github,
	google: env.google,
	secret: env.betterAuthSecret,
	trustedOrigins: env.trustedOrigins,
});
const app = createApp(db, {
	auth,
	corsOrigins: env.trustedOrigins,
	logger,
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

export type { AppType } from "./app.js";
