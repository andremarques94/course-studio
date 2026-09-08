import { strict as assert } from "node:assert";
import { test } from "node:test";
import { InvitationRateLimitError } from "#api/modules/invitations/errors";
import { createInvitationRateLimiter } from "#api/modules/invitations/rate-limit";

test("throttles invitation attempts by account and normalized recipient", async () => {
	const limiter = createInvitationRateLimiter({
		account: 2,
		recipient: 1,
		windowMs: 60_000,
		maxEntries: 10,
	});

	await limiter.consume("owner-a", "person@example.com");
	await assert.rejects(
		limiter.consume("owner-b", "person@example.com"),
		(error: unknown) =>
			error instanceof InvitationRateLimitError &&
			error.retryAfterSeconds === 60,
	);
	await limiter.consume("owner-a", "other@example.com");
	await assert.rejects(
		limiter.consume("owner-a", "third@example.com"),
		InvitationRateLimitError,
	);
});

test("bounds rate-limit memory and frees expired entries", async () => {
	const limiter = createInvitationRateLimiter({
		account: 2,
		recipient: 2,
		windowMs: 20,
		maxEntries: 1,
	});

	await limiter.consume("owner-a", "first@example.com");
	await assert.rejects(
		limiter.consume("owner-b", "second@example.com"),
		InvitationRateLimitError,
	);
	await new Promise((resolve) => setTimeout(resolve, 30));
	await assert.doesNotReject(limiter.consume("owner-b", "second@example.com"));
});
