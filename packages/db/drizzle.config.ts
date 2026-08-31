import { existsSync } from "node:fs";
import { env, loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const rootEnvPath = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnvPath)) {
	loadEnvFile(rootEnvPath);
}

const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is required to run Drizzle Kit.");
}

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/index.ts",
	out: "./drizzle",
	dbCredentials: {
		url: databaseUrl,
	},
});
