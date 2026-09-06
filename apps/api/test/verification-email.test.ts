import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createVerificationMessage } from "#api/verification-email";

test("creates a branded verification email with text fallback", () => {
	const url =
		'https://api.example.com/api/auth/verify-email?token=a&callbackURL="unsafe"';
	const message = createVerificationMessage(url);

	assert.equal(message.subject, "Verify your email | Course Studio");
	assert.match(message.text, /You're one click away/);
	assert.match(
		message.text,
		new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
	);
	assert.match(message.html, /then open the studio/);
	assert.match(message.html, /Verify email/);
	assert.doesNotMatch(message.html, /href="[^"]*"unsafe"/);
	assert.match(message.html, /&amp;callbackURL=&quot;unsafe&quot;/);
});
