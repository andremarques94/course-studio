import { strict as assert } from "node:assert";
import { test } from "node:test";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { InvitationRateLimitError } from "#api/modules/invitations/errors";
import { createInvitationRateLimiter } from "#api/modules/invitations/rate-limit";

test("RateLimiterMemory exposes synchronous fixed-window state to the adapter", async () => {
	const limiter = new RateLimiterMemory({ points: 1, duration: 60 });
	const pending = limiter.consume("key");

	assert.equal(limiter.dump().storage[0]?.value, 1);
	await pending;
});

test("composite limits preflight both dimensions without partial accounting", async () => {
	const limiter = createInvitationRateLimiter({
		account: 2,
		recipient: 1,
		windowMs: 60_000,
		maxEntries: 3,
	});

	await limiter.consume("owner-a", "person@example.com");
	await assert.rejects(
		limiter.consume("owner-a", "person@example.com"),
		InvitationRateLimitError,
	);
	await assert.rejects(
		limiter.consume("owner-b", "person@example.com"),
		InvitationRateLimitError,
	);

	// Recipient rejection did not spend the independently available account point.
	await limiter.consume("owner-b", "other@example.com");
	await limiter.consume("owner-b", "third@example.com");
	await assert.rejects(
		limiter.consume("owner-c", "fourth@example.com"),
		InvitationRateLimitError,
	);
});
