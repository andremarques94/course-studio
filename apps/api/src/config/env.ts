import { z } from "zod";

const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		DATABASE_URL: z.url(),
		API_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
		PORT: z.coerce.number().int().min(1).max(65_535).optional(),
		CORS_ORIGINS: z.string().trim().min(1).optional(),
		LOG_LEVEL: z
			.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
			.default("info"),
	})
	.transform((env) => ({
		nodeEnv: env.NODE_ENV,
		databaseUrl: env.DATABASE_URL,
		apiPort: env.API_PORT ?? env.PORT ?? 3001,
		corsOrigins: env.CORS_ORIGINS
			? env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
			: ["*"],
		logLevel: env.LOG_LEVEL,
	}))
	.superRefine((env, context) => {
		const origins = z
			.array(z.union([z.literal("*"), z.url()]))
			.safeParse(env.corsOrigins);
		if (!origins.success) {
			for (const issue of origins.error.issues) {
				context.addIssue({ ...issue, path: ["CORS_ORIGINS", ...issue.path] });
			}
		}

		if (env.nodeEnv === "production" && env.corsOrigins.includes("*")) {
			context.addIssue({
				code: "custom",
				path: ["CORS_ORIGINS"],
				message: "CORS_ORIGINS must list explicit origins in production.",
			});
		}
	});

export function loadEnv(input: NodeJS.ProcessEnv = process.env) {
	return envSchema.parse(input);
}
