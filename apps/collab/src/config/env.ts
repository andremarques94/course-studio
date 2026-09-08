import { z } from "zod";

const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		COLLAB_HOST: z.string().trim().min(1).default("127.0.0.1"),
		COLLAB_PORT: z.coerce
			.number()
			.pipe(z.int().min(1).max(65_535))
			.default(3002),
		COLLAB_AUTH_REVALIDATION_INTERVAL_MS: z.coerce
			.number()
			.pipe(z.int().min(1_000).max(60_000))
			.default(5_000),
		COLLAB_AUTH_REVALIDATION_TIMEOUT_MS: z.coerce
			.number()
			.pipe(z.int().min(1_000).max(10_000))
			.default(5_000),
		DATABASE_URL: z.url(),
		BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
		LOG_LEVEL: z
			.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
			.default("info"),
	})
	.transform((env) => ({
		nodeEnv: env.NODE_ENV,
		host: env.COLLAB_HOST,
		port: env.COLLAB_PORT,
		authRevalidationIntervalMs: env.COLLAB_AUTH_REVALIDATION_INTERVAL_MS,
		authRevalidationTimeoutMs: env.COLLAB_AUTH_REVALIDATION_TIMEOUT_MS,
		databaseUrl: env.DATABASE_URL,
		betterAuthUrl: env.BETTER_AUTH_URL.replace(/\/$/, ""),
		logLevel: env.LOG_LEVEL,
	}));

export function loadEnv(input: NodeJS.ProcessEnv = process.env) {
	return envSchema.parse(input);
}
