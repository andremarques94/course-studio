import { strict as assert } from "node:assert";
import { test } from "node:test";
import { InvitationRateLimitError } from "#api/modules/invitations/errors";
import { createInvitationRateLimiter } from "#api/modules/invitations/rate-limit";

test("throttles invitation attempts by account and normalized recipient", () => {
	let now = 1_000;
	const limiter = createInvitationRateLimiter(
		{ account: 2, recipient: 1, windowMs: 60_000, maxEntries: 10 },
		() => now,
	);

	limiter.consume("owner-a", "person@example.com");
	assert.throws(
		() => limiter.consume("owner-b", "person@example.com"),
		(error: unknown) =>
			error instanceof InvitationRateLimitError &&
			error.retryAfterSeconds === 60,
	);
	limiter.consume("owner-a", "other@example.com");
	assert.throws(
		() => limiter.consume("owner-a", "third@example.com"),
		InvitationRateLimitError,
	);

	now += 60_000;
	assert.doesNotThrow(() => limiter.consume("owner-a", "person@example.com"));
});

test("bounds rate-limit memory and frees expired entries", () => {
	let now = 1_000;
	const limiter = createInvitationRateLimiter(
		{ account: 2, recipient: 2, windowMs: 1_000, maxEntries: 1 },
		() => now,
	);

	limiter.consume("owner-a", "first@example.com");
	assert.throws(
		() => limiter.consume("owner-b", "second@example.com"),
		InvitationRateLimitError,
	);
	now += 1_000;
	assert.doesNotThrow(() => limiter.consume("owner-b", "second@example.com"));
});
