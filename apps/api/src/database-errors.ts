type PostgresError = {
	code: string;
	constraint?: string;
};

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
