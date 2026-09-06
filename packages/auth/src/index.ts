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
	sendVerificationEmail?: (input: {
		user: { email: string };
		url: string;
	}) => Promise<void>;
};

export function createAuthConfiguration(options: AuthOptions) {
	return {
		appName: "Course Studio",
		baseURL: options.baseURL,
		secret: options.secret,
		trustedOrigins: options.trustedOrigins,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
		},
		emailVerification: {
			sendOnSignUp: true,
			sendOnSignIn: true,
			autoSignInAfterVerification: false,
			sendVerificationEmail: options.sendVerificationEmail,
		},
		socialProviders: {
			...(options.github ? { github: options.github } : {}),
			...(options.google ? { google: options.google } : {}),
		},
		account: {
			accountLinking: {
				requireLocalEmailVerified: true,
				disableImplicitLinking: true,
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
	};
}

export function createAuth(db: Database, options: AuthOptions) {
	return betterAuth({
		...createAuthConfiguration(options),
		database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];
