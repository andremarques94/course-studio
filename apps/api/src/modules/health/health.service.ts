import type { Database } from "@course-studio/db";
import { sql } from "drizzle-orm";

export function createHealthService(db: Database) {
	return {
		async checkDatabase() {
			await db.execute(sql`select 1`);
			return { status: "ok" as const };
		},
	};
}

export type HealthService = ReturnType<typeof createHealthService>;
