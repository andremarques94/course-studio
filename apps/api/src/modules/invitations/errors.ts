export class InvitationDeliveryError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "InvitationDeliveryError";
	}
}

export class InvitationRateLimitError extends Error {
	constructor(
		readonly retryAfterSeconds: number,
		message = `Too many invitation attempts. Try again in ${retryAfterSeconds} seconds.`,
	) {
		super(message);
		this.name = "InvitationRateLimitError";
	}
}
