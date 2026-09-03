import { z } from "zod";

const originSchema = z
	.url()
	.refine((origin) => {
		const url = new URL(origin);
		return url.pathname === "/" && !url.search && !url.hash;
	}, "Must be an origin without a path, query, or fragment.")
	.transform((origin) => new URL(origin).origin);

const originsSchema = z
	.string()
	.trim()
	.min(1)
	.transform((origins) => origins.split(",").map((origin) => origin.trim()))
	.pipe(z.array(originSchema).min(1));

function createGitHubConfig(clientId?: string, clientSecret?: string) {
	if (!clientId || !clientSecret) {
		return undefined;
	}

	return { clientId, clientSecret };
}

const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		DATABASE_URL: z.url(),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: originSchema.optional(),
		BETTER_AUTH_TRUSTED_ORIGINS: originsSchema.optional(),
		GITHUB_CLIENT_ID: z.string().trim().min(1).optional(),
		GITHUB_CLIENT_SECRET: z.string().trim().min(1).optional(),
		API_PORT: z.coerce.number().pipe(z.int().min(1).max(65_535)).optional(),
		PORT: z.coerce.number().pipe(z.int().min(1).max(65_535)).optional(),
		LOG_LEVEL: z
			.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
			.default("info"),
	})
	.superRefine((env, context) => {
		[
			{
				invalid: env.NODE_ENV === "production" && !env.BETTER_AUTH_URL,
				path: "BETTER_AUTH_URL",
				message: "BETTER_AUTH_URL is required in production.",
			},
			{
				invalid:
					env.NODE_ENV === "production" && !env.BETTER_AUTH_TRUSTED_ORIGINS,
				path: "BETTER_AUTH_TRUSTED_ORIGINS",
				message: "BETTER_AUTH_TRUSTED_ORIGINS is required in production.",
			},
			{
				invalid:
					Boolean(env.GITHUB_CLIENT_ID) !== Boolean(env.GITHUB_CLIENT_SECRET),
				path: "GITHUB_CLIENT_ID",
				message: "GitHub client ID and secret must be configured together.",
			},
		].forEach(({ invalid, path, message }) => {
			if (invalid) {
				context.addIssue({ code: "custom", path: [path], message });
			}
		});
	})
	.transform((env) => ({
		nodeEnv: env.NODE_ENV,
		databaseUrl: env.DATABASE_URL,
		apiPort: env.API_PORT ?? env.PORT ?? 3001,
		betterAuthSecret: env.BETTER_AUTH_SECRET,
		betterAuthUrl: env.BETTER_AUTH_URL ?? "http://localhost:3001",
		trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS ?? [
			"http://localhost:3000",
		],
		github: createGitHubConfig(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET),
		logLevel: env.LOG_LEVEL,
	}));

export function loadEnv(input: NodeJS.ProcessEnv = process.env) {
	return envSchema.parse(input);
}
