export function findPostgresErrorCode(error: unknown): string | undefined {
	let current = error;

	for (let depth = 0; depth < 3 && current instanceof Error; depth += 1) {
		if ("code" in current && typeof current.code === "string") {
			return current.code;
		}
		current = current.cause;
	}

	return undefined;
}
