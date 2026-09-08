import { z } from "zod";

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

const redirectValidationOrigin = "https://course-studio.invalid";

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
	if (
		(value !== "/studio" && !value.startsWith("/studio/")) ||
		/[\\?#]/.test(value) ||
		hasControlCharacter(value) ||
		/%(?![0-9A-Fa-f]{2})/.test(value)
	) {
		return false;
	}

	try {
		// Resolve the relative path only to detect normalization and origin escapes.
		// This does not perform a network request.
		const studioURL = new URL(value, redirectValidationOrigin);
		return (
			studioURL.origin === redirectValidationOrigin &&
			studioURL.pathname === value
		);
	} catch {
		return false;
	}
}

function hasControlCharacter(value: string) {
	return Array.from(value).some((character) => {
		const codePoint = character.codePointAt(0) ?? 0;
		return codePoint <= 31 || codePoint === 127;
	});
}
