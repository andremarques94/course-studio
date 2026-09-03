import { strict as assert } from "node:assert";
import { test } from "node:test";
import { loadEnv } from "../src/config/env.js";

const databaseUrl = "postgresql://user:password@localhost:5432/course_studio";
const secret = "test-secret-that-is-at-least-32-characters";
const baseEnv = { BETTER_AUTH_SECRET: secret, DATABASE_URL: databaseUrl };

test("development uses the local web origin when trusted origins are omitted", () => {
	const env = loadEnv(baseEnv);

	assert.deepEqual(env.trustedOrigins, ["http://localhost:3000"]);
	assert.equal(env.nodeEnv, "development");
});

test("production requires explicit auth URL and trusted origins", () => {
	assert.throws(() => loadEnv({ ...baseEnv, NODE_ENV: "production" }));

	const env = loadEnv({
		...baseEnv,
		NODE_ENV: "production",
		BETTER_AUTH_URL: "https://api.example.com",
		BETTER_AUTH_TRUSTED_ORIGINS:
			"https://studio.example.com, https://admin.example.com",
	});

	assert.deepEqual(env.trustedOrigins, [
		"https://studio.example.com",
		"https://admin.example.com",
	]);
});

test("normalizes configured URLs to browser origins", () => {
	const env = loadEnv({
		...baseEnv,
		BETTER_AUTH_TRUSTED_ORIGINS:
			"http://192.168.1.99:3000/, https://studio.example.com",
	});

	assert.deepEqual(env.trustedOrigins, [
		"http://192.168.1.99:3000",
		"https://studio.example.com",
	]);
});

test("rejects a CORS URL containing more than an origin", () => {
	assert.throws(() =>
		loadEnv({
			...baseEnv,
			BETTER_AUTH_TRUSTED_ORIGINS: "https://studio.example.com/path",
		}),
	);
});

test("uses a deployment platform PORT when API_PORT is not set", () => {
	const env = loadEnv({ ...baseEnv, PORT: "8080" });

	assert.equal(env.apiPort, 8080);
});

test("requires GitHub OAuth credentials as a pair", () => {
	assert.throws(() => loadEnv({ ...baseEnv, GITHUB_CLIENT_ID: "client" }));
	assert.deepEqual(
		loadEnv({
			...baseEnv,
			GITHUB_CLIENT_ID: "client",
			GITHUB_CLIENT_SECRET: "secret",
		}).github,
		{ clientId: "client", clientSecret: "secret" },
	);
});
