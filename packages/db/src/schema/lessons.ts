import {
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { courses } from "./courses.js";

export const lessons = pgTable(
	"lessons",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		courseId: uuid("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		slug: text("slug").notNull(),
		markdown: text("markdown").notNull().default(""),
		themeId: text("theme_id").notNull().default("minimal"),
		position: integer("position").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		unique("lessons_course_id_slug_unique").on(table.courseId, table.slug),
	],
);
