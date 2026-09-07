import { z } from "zod";

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export function getInvitationPath(token: unknown) {
	const parsed = invitationTokenSchema.safeParse(token);
	return parsed.success
		? (`/invitations/accept?token=${parsed.data}` as const)
		: undefined;
}

export function getSafeAuthRedirect(value: unknown) {
	if (typeof value !== "string") {
		return "/studio";
	}

	if (isStudioPath(value)) {
		return value;
	}

	const match = /^\/invitations\/accept\?token=([A-Za-z0-9_-]{43})$/.exec(
		value,
	);
	return getInvitationPath(match?.[1]) ?? "/studio";
}

// Query strings on studio redirects are intentionally rejected: allowing them
// would let a crafted `?next=` smuggle a post-login destination past this check.
function isStudioPath(value: string) {
	const studioURL = new URL(value, "https://course-studio.invalid");
	return (
		studioURL.origin === "https://course-studio.invalid" &&
		studioURL.pathname === value &&
		(value === "/studio" || value.startsWith("/studio/"))
	);
}
