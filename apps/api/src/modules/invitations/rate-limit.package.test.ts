import { strict as assert } from "node:assert";
import { test } from "node:test";
import { InvitationRateLimitError } from "#api/modules/invitations/errors";
import { createInvitationRateLimiter } from "#api/modules/invitations/rate-limit";

test("concurrent requests cannot overspend or partially consume quotas", async () => {
	const limiter = createInvitationRateLimiter({
		account: 1,
		recipient: 1,
		windowMs: 60_000,
		maxEntries: 100,
	});
	const results = await Promise.allSettled(
		Array.from({ length: 20 }, (_, i) =>
			limiter.consume(`owner-${i}`, "shared@example.com"),
		),
	);
	assert.equal(
		results.filter((result) => result.status === "fulfilled").length,
		1,
	);
	for (const [i, result] of results.entries()) {
		if (result.status === "rejected") {
			assert.ok(result.reason instanceof InvitationRateLimitError);
			await limiter.consume(`owner-${i}`, `other-${i}@example.com`);
		}
	}
	const accountResults = await Promise.allSettled(
		Array.from({ length: 20 }, (_, i) =>
			limiter.consume("shared-owner", `new-${i}@example.com`),
		),
	);
	assert.equal(
		accountResults.filter((result) => result.status === "fulfilled").length,
		1,
	);
	for (const [i, result] of accountResults.entries()) {
		if (result.status === "rejected") {
			assert.ok(result.reason instanceof InvitationRateLimitError);
			await limiter.consume(`fresh-owner-${i}`, `new-${i}@example.com`);
		}
	}
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
