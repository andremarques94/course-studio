import { sql } from "drizzle-orm";
import {
	check,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { courseRole } from "./course-members.js";
import { courses } from "./courses.js";

export const courseInvitations = pgTable(
	"course_invitations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		courseId: uuid("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: courseRole("role").notNull(),
		tokenHash: text("token_hash").notNull(),
		invitedBy: text("invited_by")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("course_invitations_course_id_idx").on(table.courseId),
		uniqueIndex("course_invitations_token_hash_uidx").on(table.tokenHash),
		uniqueIndex("course_invitations_pending_course_email_uidx")
			.on(table.courseId, table.email)
			.where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
		check(
			"course_invitations_normalized_email_check",
			sql`${table.email} = lower(btrim(${table.email})) and ${table.email} <> ''`,
		),
		check(
			"course_invitations_terminal_state_check",
			sql`${table.acceptedAt} is null or ${table.revokedAt} is null`,
		),
	],
);
