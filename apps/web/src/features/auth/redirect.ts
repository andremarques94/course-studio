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

	const studioURL = new URL(value, "https://course-studio.invalid");
	if (
		studioURL.origin === "https://course-studio.invalid" &&
		studioURL.pathname === value &&
		(value === "/studio" || value.startsWith("/studio/"))
	) {
		return value;
	}

	const match = /^\/invitations\/accept\?token=([A-Za-z0-9_-]{43})$/.exec(
		value,
	);
	return getInvitationPath(match?.[1]) ?? "/studio";
}
