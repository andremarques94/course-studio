import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorCode =
	| "COURSE_NOT_FOUND"
	| "INVALID_LESSON_ORDER"
	| "INTERNAL_ERROR"
	| "LESSON_NOT_FOUND"
	| "NOT_FOUND"
	| "SLUG_ALREADY_EXISTS"
	| "UNAUTHORIZED"
	| "VALIDATION_ERROR";

export class ApiError extends Error {
	constructor(
		readonly status: ContentfulStatusCode,
		readonly code: ErrorCode,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}
