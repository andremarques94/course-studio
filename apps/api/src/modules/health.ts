import type { Database } from "@course-studio/db";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

export function createHealthRoutes(db: Database) {
	return new Hono()
		.get("/health", (context) => context.json({ status: "ok" as const }))
		.get("/health/db", async (context) => {
			await db.execute(sql`select 1`);
			return context.json({ status: "ok" as const });
		});
}
