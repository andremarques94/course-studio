import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
	createInvitationInputSchema,
	createTitleInputSchema,
	invitationTokenSchema,
	normalizedEmailSchema,
	renameLessonInputSchema,
	reorderLessonsInputSchema,
	titleSchema,
} from "../src/index.js";

test("titles are trimmed before checking required and maximum length rules", () => {
	assert.deepEqual(
		createTitleInputSchema.parse({ title: "  Course title  " }),
		{
			title: "Course title",
		},
	);
	assert.equal(titleSchema.parse(`  ${"x".repeat(80)}  `).length, 80);
	for (const value of ["", "   ", "x".repeat(81), null, 42]) {
		assert.equal(titleSchema.safeParse(value).success, false);
	}
});

test("title validation retains the form feedback messages", () => {
	for (const [value, message] of [
		["  ", "A title is required."],
		["x".repeat(81), "Titles must be 80 characters or fewer."],
	]) {
		const result = titleSchema.safeParse(value);
		assert.equal(result.success, false);
		if (!result.success) {
			assert.equal(result.error.issues[0]?.message, message);
		}
	}
});

test("invitation email normalization happens before validation", () => {
	assert.equal(
		normalizedEmailSchema.parse("  Person.Name@EXAMPLE.COM "),
		"person.name@example.com",
	);
	const result = normalizedEmailSchema.safeParse("not-an-email");
	assert.equal(result.success, false);
	if (!result.success) {
		assert.equal(
			result.error.issues[0]?.message,
			"Enter a valid email address.",
		);
	}
});

test("invitations require a valid email and an editor or viewer role", () => {
	for (const role of ["editor", "viewer"]) {
		assert.deepEqual(
			createInvitationInputSchema.parse({
				email: " Person@EXAMPLE.COM ",
				role,
			}),
			{ email: "person@example.com", role },
		);
	}
	for (const input of [
		{ email: "person@example.com", role: "owner" },
		{ email: "person@example.com" },
		{ email: "invalid", role: "viewer" },
	]) {
		assert.equal(createInvitationInputSchema.safeParse(input).success, false);
	}
});

test("lesson renames require a title and reject unrelated fields", () => {
	assert.deepEqual(renameLessonInputSchema.parse({ title: "  Renamed  " }), {
		title: "Renamed",
	});
	for (const input of [
		{},
		{ title: undefined },
		{ title: "" },
		{ title: "Title", themeId: "dark" },
	]) {
		assert.equal(renameLessonInputSchema.safeParse(input).success, false);
	}
});

test("lesson ordering accepts unique UUIDs and rejects duplicates", () => {
	const id = "550e8400-e29b-41d4-a716-446655440000";
	assert.deepEqual(reorderLessonsInputSchema.parse({ lessonIds: [id] }), {
		lessonIds: [id],
	});
	assert.equal(
		reorderLessonsInputSchema.safeParse({ lessonIds: [id, id] }).success,
		false,
	);
	assert.equal(
		reorderLessonsInputSchema.safeParse({ lessonIds: ["invalid"] }).success,
		false,
	);
});

test("invitation tokens accept only the generated URL-safe format", () => {
	assert.equal(invitationTokenSchema.parse("a".repeat(43)), "a".repeat(43));
	for (const token of [
		"",
		"a".repeat(42),
		"a".repeat(44),
		`${"a".repeat(42)}+`,
		" a".repeat(22),
	]) {
		assert.equal(invitationTokenSchema.safeParse(token).success, false);
	}
});
