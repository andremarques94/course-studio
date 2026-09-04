import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig, devices } from "@playwright/test";
import { e2eEnvironment } from "./e2e/environment";

if (existsSync(".env")) {
	loadEnvFile(".env");
}

const authSecret =
	process.env.BETTER_AUTH_SECRET ??
	"integration-test-secret-with-32-characters";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	workers: 1,
	timeout: 60_000,
	expect: {
		timeout: 15_000,
	},
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	reporter: process.env.CI
		? [["line"], ["html", { open: "never" }]]
		: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: e2eEnvironment.urls.web,
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
		video: "off",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: [
		{
			name: "API",
			command: "node --env-file-if-exists=.env apps/api/dist/index.js",
			env: {
				API_PORT: String(e2eEnvironment.ports.api),
				BETTER_AUTH_SECRET: authSecret,
				BETTER_AUTH_TRUSTED_ORIGINS: e2eEnvironment.urls.web,
				BETTER_AUTH_URL: e2eEnvironment.urls.api,
			},
			url: `${e2eEnvironment.urls.api}/api/health/db`,
			gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
		{
			name: "Web",
			command: `pnpm --filter @course-studio/web exec vite dev --host ${e2eEnvironment.host} --port ${e2eEnvironment.ports.web} --strictPort`,
			env: {
				VITE_API_URL: e2eEnvironment.urls.api,
				VITE_COLLAB_URL: e2eEnvironment.urls.collaboration,
			},
			url: `${e2eEnvironment.urls.web}/sign-in`,
			gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
	],
});
