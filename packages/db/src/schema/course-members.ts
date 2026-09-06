import {
	index,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { courses } from "./courses.js";

export const courseRole = pgEnum("course_role", ["editor", "viewer"]);

export const courseMembers = pgTable(
	"course_members",
	{
		courseId: uuid("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: courseRole("role").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.courseId, table.userId] }),
		index("course_members_user_id_idx").on(table.userId),
	],
);
