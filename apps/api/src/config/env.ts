import { z } from "zod";

const corsOriginSchema = z.union([
	z.literal("*"),
	z
		.url()
		.refine((origin) => {
			const url = new URL(origin);
			return url.pathname === "/" && !url.search && !url.hash;
		}, "CORS origins cannot include a path, query, or fragment.")
		.transform((origin) => new URL(origin).origin),
]);

const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		DATABASE_URL: z.url(),
		API_PORT: z.coerce.number().pipe(z.int().min(1).max(65_535)).optional(),
		PORT: z.coerce.number().pipe(z.int().min(1).max(65_535)).optional(),
		CORS_ORIGINS: z
			.string()
			.trim()
			.min(1)
			.transform((origins) => origins.split(",").map((origin) => origin.trim()))
			.pipe(z.array(corsOriginSchema))
			.optional(),
		LOG_LEVEL: z
			.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
			.default("info"),
	})
	.transform((env) => ({
		nodeEnv: env.NODE_ENV,
		databaseUrl: env.DATABASE_URL,
		apiPort: env.API_PORT ?? env.PORT ?? 3001,
		corsOrigins: env.CORS_ORIGINS ?? ["*"],
		logLevel: env.LOG_LEVEL,
	}))
	.superRefine((env, context) => {
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
