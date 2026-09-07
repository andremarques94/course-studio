import { InvitationRateLimitError } from "#api/modules/invitations/errors";

export const defaultInvitationRateLimits = {
	account: 20,
	recipient: 10,
	windowMs: 15 * 60 * 1000,
	maxEntries: 10_000,
};

export type InvitationRateLimits = typeof defaultInvitationRateLimits;

type Counter = { count: number; expiresAt: number };

export function createInvitationRateLimiter(
	limits: InvitationRateLimits = defaultInvitationRateLimits,
	now: () => number = Date.now,
) {
	const accounts = new Map<string, Counter>();
	const recipients = new Map<string, Counter>();

	return {
		consume(accountId: string, recipient: string) {
			const currentTime = now();
			cleanupExpired(accounts, currentTime);
			cleanupExpired(recipients, currentTime);

			const account = accounts.get(accountId);
			const recipientCounter = recipients.get(recipient);
			const blockedUntil = Math.max(
				account && account.count >= limits.account ? account.expiresAt : 0,
				recipientCounter && recipientCounter.count >= limits.recipient
					? recipientCounter.expiresAt
					: 0,
			);
			if (blockedUntil > currentTime) {
				throw rateLimitError(blockedUntil, currentTime);
			}

			if (
				(!account && accounts.size >= limits.maxEntries) ||
				(!recipientCounter && recipients.size >= limits.maxEntries)
			) {
				throw new InvitationRateLimitError(Math.ceil(limits.windowMs / 1000));
			}

			increment(accounts, accountId, account, currentTime + limits.windowMs);
			increment(
				recipients,
				recipient,
				recipientCounter,
				currentTime + limits.windowMs,
			);
		},
	};
}

function increment(
	counters: Map<string, Counter>,
	key: string,
	counter: Counter | undefined,
	expiresAt: number,
) {
	if (counter) {
		counter.count += 1;
		return;
	}
	counters.set(key, { count: 1, expiresAt });
}

function cleanupExpired(counters: Map<string, Counter>, now: number) {
	for (const [key, counter] of counters) {
		if (counter.expiresAt <= now) {
			counters.delete(key);
		}
	}
}

function rateLimitError(blockedUntil: number, now: number) {
	return new InvitationRateLimitError(
		Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
	);
}
