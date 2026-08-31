import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export function createDatabase(databaseUrl: string) {
	const pool = new Pool({ connectionString: databaseUrl });

	return drizzle({ client: pool, schema });
}

export type Database = ReturnType<typeof createDatabase>;
