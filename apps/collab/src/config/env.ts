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
		DATABASE_URL: z.url(),
		BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
		LOG_LEVEL: z
			.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
			.default("info"),
	})
	.superRefine((env, context) => {
		if (env.NODE_ENV === "production") {
			context.addIssue({
				code: "custom",
				path: ["NODE_ENV"],
				message:
					"The collaboration server is development-only until lesson authorization is implemented.",
			});
		}
	})
	.transform((env) => ({
		nodeEnv: env.NODE_ENV,
		host: env.COLLAB_HOST,
		port: env.COLLAB_PORT,
		databaseUrl: env.DATABASE_URL,
		betterAuthUrl: env.BETTER_AUTH_URL.replace(/\/$/, ""),
		logLevel: env.LOG_LEVEL,
	}));

export function loadEnv(input: NodeJS.ProcessEnv = process.env) {
	return envSchema.parse(input);
}
