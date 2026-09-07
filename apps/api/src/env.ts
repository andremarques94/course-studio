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

function createOAuthConfig(clientId?: string, clientSecret?: string) {
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
		WEB_ORIGIN: originSchema.optional(),
		GITHUB_CLIENT_ID: z.string().trim().min(1).optional(),
		GITHUB_CLIENT_SECRET: z.string().trim().min(1).optional(),
		GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
		GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
		API_PORT: z.coerce.number().pipe(z.int().min(1).max(65_535)).optional(),
		PORT: z.coerce.number().pipe(z.int().min(1).max(65_535)).optional(),
		SMTP_HOST: z.string().trim().min(1).optional(),
		SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
		SMTP_SECURE: z
			.enum(["true", "false"])
			.default("false")
			.transform((v) => v === "true"),
		SMTP_USER: z.string().min(1).optional(),
		SMTP_PASSWORD: z.string().min(1).optional(),
		MAIL_FROM: z.email().optional(),
		LOG_LEVEL: z
			.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
			.default("info"),
	})
	.superRefine((env, context) => {
		[
			{
				invalid:
					env.NODE_ENV === "production" && (!env.SMTP_HOST || !env.MAIL_FROM),
				path: "SMTP_HOST",
				message:
					"SMTP_HOST and MAIL_FROM are required in production for email verification.",
			},
			{
				invalid: Boolean(env.SMTP_HOST) !== Boolean(env.MAIL_FROM),
				path: "MAIL_FROM",
				message: "SMTP_HOST and MAIL_FROM must be configured together.",
			},
			{
				invalid: Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD),
				path: "SMTP_USER",
				message: "SMTP_USER and SMTP_PASSWORD must be configured together.",
			},
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
			{
				invalid:
					Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET),
				path: "GOOGLE_CLIENT_ID",
				message: "Google client ID and secret must be configured together.",
			},
		].forEach(({ invalid, path, message }) => {
			if (invalid) {
				context.addIssue({ code: "custom", path: [path], message });
			}
		});
	})
	.transform((env) => {
		// Invitation links default to the first trusted origin so the two values
		// can't drift. Set WEB_ORIGIN only when links must differ from CORS origins.
		const trustedOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS ?? [
			"http://localhost:3000",
		];
		return {
			nodeEnv: env.NODE_ENV,
			smtp:
				env.SMTP_HOST && env.MAIL_FROM
					? {
							host: env.SMTP_HOST,
							port: env.SMTP_PORT,
							secure: env.SMTP_SECURE,
							user: env.SMTP_USER,
							password: env.SMTP_PASSWORD,
							from: env.MAIL_FROM,
						}
					: undefined,
			databaseUrl: env.DATABASE_URL,
			apiPort: env.API_PORT ?? env.PORT ?? 3001,
			betterAuthSecret: env.BETTER_AUTH_SECRET,
			betterAuthUrl: env.BETTER_AUTH_URL ?? "http://localhost:3001",
			webOrigin: env.WEB_ORIGIN ?? trustedOrigins[0] ?? "http://localhost:3000",
			trustedOrigins,
			github: createOAuthConfig(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET),
			google: createOAuthConfig(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
			logLevel: env.LOG_LEVEL,
		};
	});

export function loadEnv(input: NodeJS.ProcessEnv = process.env) {
	return envSchema.parse(input);
}
