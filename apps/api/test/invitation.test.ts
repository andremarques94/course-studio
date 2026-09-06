import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createCourseInvitationMessage } from "#api/modules/invitations/email";
import { normalizedEmailSchema } from "#api/modules/invitations/schema";
import {
	createInvitationToken,
	createInvitationUrl,
	hashInvitationToken,
} from "#api/modules/invitations/token";

test("normalizes invitation email once and validates it", () => {
	assert.equal(
		normalizedEmailSchema.parse("  Person.Name@EXAMPLE.COM "),
		"person.name@example.com",
	);
	assert.throws(() => normalizedEmailSchema.parse("not-an-email"));
});

test("creates high-entropy URL-safe invitation tokens and SHA-256 hashes", () => {
	const { token, tokenHash } = createInvitationToken();

	assert.match(token, /^[A-Za-z0-9_-]{43}$/);
	assert.match(tokenHash, /^[a-f0-9]{64}$/);
	assert.equal(tokenHash, hashInvitationToken(token));
	assert.notEqual(tokenHash, token);
	assert.equal(
		new URL(
			createInvitationUrl("https://studio.example.com", token),
		).searchParams.get("token"),
		token,
	);
});

test("escapes invitation content in HTML and includes a text fallback", () => {
	const message = createCourseInvitationMessage({
		url: 'https://studio.example.com/invitations/accept?token="><unsafe>',
		courseTitle: "TypeScript <script>alert(1)</script>",
		role: "editor",
	});

	assert.match(message.text, /TypeScript <script>/);
	assert.doesNotMatch(message.html, /<script>alert/);
	assert.match(message.html, /&lt;script&gt;alert/);
	assert.doesNotMatch(message.html, /href="[^"]*"><unsafe>/);
});
