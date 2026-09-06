import { createHash, randomBytes } from "node:crypto";

export function hashInvitationToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

export function createInvitationToken() {
	const token = randomBytes(32).toString("base64url");
	return { token, tokenHash: hashInvitationToken(token) };
}

export function createInvitationUrl(webOrigin: string, token: string) {
	const url = new URL("/invitations/accept", webOrigin);
	url.searchParams.set("token", token);
	return url.toString();
}
