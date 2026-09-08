import { RateLimiterMemory } from "rate-limiter-flexible";
import { InvitationRateLimitError } from "#api/modules/invitations/errors";

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

	return {
		async consume(accountId: string, recipient: string) {
			const currentTime = Date.now();
			const accountState = snapshot(accounts, currentTime);
			const recipientState = snapshot(recipients, currentTime);
			const account = accountState.get(accountId);
			const recipientRecord = recipientState.get(recipient);
			const blockedUntil = Math.max(
				account && account.value >= limits.account
					? (account.expiresAt ?? 0)
					: 0,
				recipientRecord && recipientRecord.value >= limits.recipient
					? (recipientRecord.expiresAt ?? 0)
					: 0,
			);
			if (blockedUntil > currentTime) {
				throw rateLimitError(blockedUntil - currentTime);
			}
			if (
				(!account && accountState.size >= limits.maxEntries) ||
				(!recipientRecord && recipientState.size >= limits.maxEntries)
			) {
				throw rateLimitError(limits.windowMs);
			}

			// RateLimiterMemory mutates both counters before returning its promises.
			// Preflighting both dimensions in this turn keeps accounting all-or-neither.
			await Promise.all([
				accounts.consume(accountId),
				recipients.consume(recipient),
			]);
		},
	};
}

function snapshot(limiter: RateLimiterMemory, currentTime: number) {
	return new Map(
		limiter
			.dump()
			.storage.flatMap((record) =>
				record.expiresAt === null || record.expiresAt > currentTime
					? [[String(record.key), record] as const]
					: [],
			),
	);
}

function rateLimitError(msBeforeNext: number) {
	return new InvitationRateLimitError(
		Math.max(1, Math.ceil(msBeforeNext / 1000)),
	);
}
