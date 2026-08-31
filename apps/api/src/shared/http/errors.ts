import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorCode =
	| "COURSE_NOT_FOUND"
	| "INVALID_LESSON_ORDER"
	| "INTERNAL_ERROR"
	| "LESSON_NOT_FOUND"
	| "NOT_FOUND"
	| "SLUG_ALREADY_EXISTS"
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

interface PostgresError {
	code: string;
	constraint?: string;
}

export function findPostgresError(error: unknown): PostgresError | undefined {
	let current = error;

	for (let depth = 0; depth < 3 && current instanceof Error; depth += 1) {
		if ("code" in current && typeof current.code === "string") {
			return current as Error & PostgresError;
		}
		current = current.cause;
	}

	return undefined;
}
