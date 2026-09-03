export { createDatabase, type Database } from "./client.js";
export * as authSchema from "./schema/auth.js";
export {
	account,
	courses,
	jwks,
	lessonDocuments,
	lessons,
	session,
	user,
	verification,
} from "./schema/index.js";
