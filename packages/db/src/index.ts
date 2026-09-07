export { createDatabase, type Database } from "./client.js";
export * as authSchema from "./schema/auth.js";
// courseRole (the pgEnum value) stays in schema/course-members.js — table
// definitions need it, but app code should use the "editor" | "viewer" strings.
export {
	account,
	courseInvitations,
	courseMembers,
	courses,
	jwks,
	lessonDocuments,
	lessons,
	session,
	user,
	verification,
} from "./schema/index.js";
