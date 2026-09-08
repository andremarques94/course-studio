import { strict as assert } from "node:assert";
import { test } from "node:test";
import { loadEnv } from "#api/env";

const databaseUrl = "postgresql://user:password@localhost:5432/course_studio";
const secret = "test-secret-that-is-at-least-32-characters";
const baseEnv = { BETTER_AUTH_SECRET: secret, DATABASE_URL: databaseUrl };

test("production cannot start without verification email delivery configured", () => {
	assert.throws(
		() =>
			loadEnv({
				...baseEnv,
				NODE_ENV: "production",
				BETTER_AUTH_URL: "https://api.example.com",
				BETTER_AUTH_TRUSTED_ORIGINS: "https://studio.example.com",
			}),
		/SMTP_HOST and MAIL_FROM/,
	);
});

test("SMTP configuration requires complete host, sender and credential pairs", () => {
	assert.throws(() => loadEnv({ ...baseEnv, SMTP_HOST: "localhost" }));
	assert.throws(() =>
		loadEnv({ ...baseEnv, MAIL_FROM: "noreply@example.com" }),
	);
	assert.throws(() => loadEnv({ ...baseEnv, SMTP_USER: "user" }));
	assert.throws(() => loadEnv({ ...baseEnv, SMTP_PASSWORD: "password" }));
	const env = loadEnv({
		...baseEnv,
		SMTP_HOST: "smtp.example.com",
		SMTP_PORT: "465",
		SMTP_SECURE: "true",
		SMTP_USER: "user",
		SMTP_PASSWORD: "password",
		MAIL_FROM: "noreply@example.com",
	});
	assert.deepEqual(env.smtp, {
		host: "smtp.example.com",
		port: 465,
		secure: true,
		user: "user",
		password: "password",
		from: "noreply@example.com",
	});
});

test("development uses the local web origin when trusted origins are omitted", () => {
	const env = loadEnv(baseEnv);

	assert.deepEqual(env.trustedOrigins, ["http://localhost:3000"]);
	assert.equal(env.webOrigin, "http://localhost:3000");
	assert.equal(env.nodeEnv, "development");
});

test("production requires explicit auth URL and trusted origins", () => {
	assert.throws(() => loadEnv({ ...baseEnv, NODE_ENV: "production" }));

	const env = loadEnv({
		...baseEnv,
		NODE_ENV: "production",
		SMTP_HOST: "smtp.example.com",
		MAIL_FROM: "noreply@example.com",
		BETTER_AUTH_URL: "https://api.example.com",
		BETTER_AUTH_TRUSTED_ORIGINS:
			"https://studio.example.com, https://admin.example.com",
		WEB_ORIGIN: "https://studio.example.com",
	});

	assert.deepEqual(env.trustedOrigins, [
		"https://studio.example.com",
		"https://admin.example.com",
	]);
});

test("web origin defaults to the first trusted origin", () => {
	const env = loadEnv({
		...baseEnv,
		NODE_ENV: "production",
		SMTP_HOST: "smtp.example.com",
		MAIL_FROM: "noreply@example.com",
		BETTER_AUTH_URL: "https://api.example.com",
		BETTER_AUTH_TRUSTED_ORIGINS:
			"https://studio.example.com, https://admin.example.com",
	});

	assert.equal(env.webOrigin, "https://studio.example.com");

	const explicit = loadEnv({
		...baseEnv,
		BETTER_AUTH_TRUSTED_ORIGINS: "https://studio.example.com",
		WEB_ORIGIN: "https://links.example.com",
	});
	assert.equal(explicit.webOrigin, "https://links.example.com");
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

test("requires Google OAuth credentials as a pair", () => {
	assert.throws(() => loadEnv({ ...baseEnv, GOOGLE_CLIENT_ID: "client" }));
	assert.deepEqual(
		loadEnv({
			...baseEnv,
			GOOGLE_CLIENT_ID: "client",
			GOOGLE_CLIENT_SECRET: "secret",
		}).google,
		{ clientId: "client", clientSecret: "secret" },
	);
});
