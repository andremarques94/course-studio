import { strict as assert } from "node:assert";
import { test } from "node:test";
import { loadEnv } from "../src/config/env.js";

const databaseUrl = "postgresql://user:password@localhost:5432/course_studio";

test("development allows all origins when CORS_ORIGINS is omitted", () => {
	const env = loadEnv({ DATABASE_URL: databaseUrl });

	assert.deepEqual(env.corsOrigins, ["*"]);
	assert.equal(env.nodeEnv, "development");
});

test("production requires explicit CORS origins", () => {
	assert.throws(() =>
		loadEnv({ DATABASE_URL: databaseUrl, NODE_ENV: "production" }),
	);

	const env = loadEnv({
		DATABASE_URL: databaseUrl,
		NODE_ENV: "production",
		CORS_ORIGINS: "https://studio.example.com, https://admin.example.com",
	});

	assert.deepEqual(env.corsOrigins, [
		"https://studio.example.com",
		"https://admin.example.com",
	]);
});

test("normalizes configured URLs to browser origins", () => {
	const env = loadEnv({
		DATABASE_URL: databaseUrl,
		CORS_ORIGINS: "http://192.168.1.99:3000/, https://studio.example.com",
	});

	assert.deepEqual(env.corsOrigins, [
		"http://192.168.1.99:3000",
		"https://studio.example.com",
	]);
});

test("rejects a CORS URL containing more than an origin", () => {
	assert.throws(() =>
		loadEnv({
			DATABASE_URL: databaseUrl,
			CORS_ORIGINS: "https://studio.example.com/path",
		}),
	);
});

test("uses a deployment platform PORT when API_PORT is not set", () => {
	const env = loadEnv({ DATABASE_URL: databaseUrl, PORT: "8080" });

	assert.equal(env.apiPort, 8080);
});
