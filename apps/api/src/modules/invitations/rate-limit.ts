import { RateLimiterMemory } from "rate-limiter-flexible";
import { InvitationRateLimitError } from "#api/modules/invitations/errors";
import { createInvitationSerializer } from "#api/modules/invitations/serialization";

export const defaultInvitationRateLimits = {
	account: 20,
	recipient: 10,
	windowMs: 15 * 60 * 1000,
	maxEntries: 10_000,
};

export type InvitationRateLimits = typeof defaultInvitationRateLimits;

export function createInvitationRateLimiter(
	limits: InvitationRateLimits = defaultInvitationRateLimits,
) {
	const duration = limits.windowMs / 1000;
	const accounts = new RateLimiterMemory({
		keyPrefix: "invitation-account",
		points: limits.account,
		duration,
	});
	const recipients = new RateLimiterMemory({
		keyPrefix: "invitation-recipient",
		points: limits.recipient,
		duration,
	});

	// Only admission bookkeeping lives here; the package owns quota counters.
	const accountEntries = new Map<string, number>();
	const recipientEntries = new Map<string, number>();
	const quotaOperations = createInvitationSerializer();

	return {
		consume(accountId: string, recipient: string) {
			// Serialize just the in-memory preflight/consume, never email delivery.
			// A rejected request spends neither quota, even with concurrent callers.
			return quotaOperations.run("quotas", async () => {
				const now = Date.now();
				pruneExpiredEntries(accountEntries, now);
				pruneExpiredEntries(recipientEntries, now);
				const [account, recipientRecord] = await Promise.all([
					accounts.get(accountId),
					recipients.get(recipient),
				]);
				const retryAfter = Math.max(
					account && account.remainingPoints === 0 ? account.msBeforeNext : 0,
					recipientRecord && recipientRecord.remainingPoints === 0
						? recipientRecord.msBeforeNext
						: 0,
				);
				if (retryAfter > 0) {
					throw rateLimitError(retryAfter);
				}
				if (
					(!accountEntries.has(accountId) &&
						accountEntries.size >= limits.maxEntries) ||
					(!recipientEntries.has(recipient) &&
						recipientEntries.size >= limits.maxEntries)
				) {
					throw rateLimitError(limits.windowMs);
				}

				const [consumedAccount, consumedRecipient] = await Promise.all([
					accounts.consume(accountId),
					recipients.consume(recipient),
				]);
				const expiresAt = Date.now() + limits.windowMs;
				if (consumedAccount.isFirstInDuration) {
					accountEntries.delete(accountId);
					accountEntries.set(accountId, expiresAt);
				}
				if (consumedRecipient.isFirstInDuration) {
					recipientEntries.delete(recipient);
					recipientEntries.set(recipient, expiresAt);
				}
			});
		},
	};
}

function pruneExpiredEntries(entries: Map<string, number>, now: number) {
	// Fixed windows are inserted in expiry order. Visit only expired entries;
	// each admitted key is removed once instead of scanning every live quota.
	for (const [key, expiresAt] of entries) {
		if (expiresAt > now) {
			break;
		}
		entries.delete(key);
	}
}

function rateLimitError(msBeforeNext: number) {
	return new InvitationRateLimitError(
		Math.max(1, Math.ceil(msBeforeNext / 1000)),
	);
}
