import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const courses = pgTable("courses", {
	id: uuid("id").primaryKey().defaultRandom(),
	title: text("title").notNull(),
	slug: text("slug").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
