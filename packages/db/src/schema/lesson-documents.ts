import { customType, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { lessons } from "./lessons.js";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
	dataType() {
		return "bytea";
	},
});

export const lessonDocuments = pgTable("lesson_documents", {
	lessonId: uuid("lesson_id")
		.primaryKey()
		.references(() => lessons.id, { onDelete: "cascade" }),
	ydoc: bytea("ydoc").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
