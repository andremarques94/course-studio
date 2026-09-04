import { createDatabase } from "@course-studio/db";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is required to run database migrations.");
}

const db = createDatabase(databaseUrl);

try {
	console.info("Running pending database migrations...");

	await migrate(db, {
		migrationsFolder: "/app/drizzle",
	});

	console.info("Database migrations completed successfully.");
} catch (error) {
	console.error("Database migration failed.", error);
	throw error;
} finally {
	await db.$client.end();
}
