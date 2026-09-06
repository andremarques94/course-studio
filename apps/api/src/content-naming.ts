import { z } from "zod";

const TITLE_MAX_LENGTH = 80;

export const titleSchema = z
	.string()
	.trim()
	.min(1, "A title is required.")
	.max(
		TITLE_MAX_LENGTH,
		`Titles must be ${TITLE_MAX_LENGTH} characters or fewer.`,
	);

export function slugify(value: string): string {
	return (
		value
			.normalize("NFKD")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "untitled"
	);
}
