import { z } from "zod";

export const TITLE_MAX_LENGTH = 80;

export const titleSchema = z
	.string()
	.trim()
	.min(1, "A title is required.")
	.max(
		TITLE_MAX_LENGTH,
		`Titles must be ${TITLE_MAX_LENGTH} characters or fewer.`,
	);

export const createTitleInputSchema = z.object({
	title: titleSchema,
});

export const entityDateSchema = z.preprocess(
	(value) => (typeof value === "string" ? new Date(value) : value),
	z.date(),
);

export const courseSchema = z.object({
	id: z.string().min(1),
	title: titleSchema,
	slug: z.string().min(1),
	createdAt: entityDateSchema,
	updatedAt: entityDateSchema,
});

export const coursesSchema = z.array(courseSchema);
