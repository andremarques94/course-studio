import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { authSchema, type Database } from "@course-studio/db";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";

export type OAuthConfig = {
	clientId: string;
	clientSecret: string;
};

export type AuthOptions = {
	baseURL: string;
	github?: OAuthConfig;
	google?: OAuthConfig;
	secret: string;
	trustedOrigins: string[];
};

export function createAuth(db: Database, options: AuthOptions) {
	return betterAuth({
		appName: "Course Studio",
		baseURL: options.baseURL,
		secret: options.secret,
		trustedOrigins: options.trustedOrigins,
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: authSchema,
		}),
		emailAndPassword: {
			enabled: true,
		},
		socialProviders: {
			...(options.github ? { github: options.github } : {}),
			...(options.google ? { google: options.google } : {}),
		},
		account: {
			accountLinking: {
				requireLocalEmailVerified: false,
			},
			encryptOAuthTokens: true,
			identityStrategy: "provider-id",
		},
		advanced: {
			database: {
				joins: true,
			},
		},
		plugins: [
			jwt({
				jwt: {
					expirationTime: "5m",
				},
			}),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];
