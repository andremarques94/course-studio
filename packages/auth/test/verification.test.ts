import assert from "node:assert/strict";
import { test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createAuthConfiguration } from "../src/index.js";

test("password accounts require a delivered verification link before receiving a session", async () => {
	let verificationURL = "";
	const configuration = createAuthConfiguration({
		baseURL: "http://localhost:3001",
		secret: "test-secret-with-at-least-thirty-two-characters",
		trustedOrigins: ["http://localhost:3000"],
		sendVerificationEmail: async ({ url }) => {
			verificationURL = url;
		},
	});
	const auth = betterAuth({
		...configuration,
		database: memoryAdapter({
			user: [],
			session: [],
			account: [],
			verification: [],
			jwks: [],
		}),
	});
	const credentials = {
		email: "author@example.com",
		password: "test-password",
		name: "Author",
	};
	const post = (path: string) =>
		auth.handler(
			new Request(`http://localhost:3001/api/auth/${path}`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "http://localhost:3000",
				},
				body: JSON.stringify(credentials),
			}),
		);
	const signup = await post("sign-up/email");
	assert.equal(signup.status, 200);
	assert.equal(signup.headers.get("set-cookie"), null);
	assert.equal((await post("sign-in/email")).status, 403);
	assert.ok(verificationURL.includes("/verify-email?"));
	const invalid = new URL(verificationURL);
	invalid.searchParams.set("token", "invalid");
	const rejected = await auth.handler(new Request(invalid));
	assert.match(rejected.headers.get("location") ?? "", /error=INVALID_TOKEN/);
	assert.equal((await post("sign-in/email")).status, 403);
	const verified = await auth.handler(new Request(verificationURL));
	assert.ok(verified.status < 400);
	assert.equal(verified.headers.get("set-cookie"), null);
	const signedIn = await post("sign-in/email");
	assert.equal(signedIn.status, 200);
	assert.match(signedIn.headers.get("set-cookie") ?? "", /session_token/);
	assert.equal(
		configuration.account.accountLinking.requireLocalEmailVerified,
		true,
	);
	assert.equal(
		configuration.account.accountLinking.disableImplicitLinking,
		true,
	);
});
