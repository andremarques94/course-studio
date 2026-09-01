import { z } from "zod";

const STORAGE_KEY = "course-studio:editor-identity";

const editorIdentitySchema = z
	.object({
		id: z.uuid(),
		name: z.string().length(10).refine(isGuestName),
		color: z.string().max(32),
		avatarUrl: z.httpUrl().max(2_048).optional(),
	})
	.refine(({ id, color }) => color === editorColorForId(id));

export type EditorIdentity = z.infer<typeof editorIdentitySchema>;

export function createEditorIdentity(): EditorIdentity {
	const id = crypto.randomUUID();
	const guestNumber = crypto.getRandomValues(new Uint16Array(1))[0] % 10_000;

	return {
		id,
		name: `Guest ${guestNumber.toString().padStart(4, "0")}`,
		color: editorColorForId(id),
	};
}

export function getSessionEditorIdentity(): EditorIdentity {
	const storedIdentity = sessionStorage.getItem(STORAGE_KEY);
	if (storedIdentity) {
		try {
			const result = editorIdentitySchema.safeParse(JSON.parse(storedIdentity));
			if (result.success) {
				return result.data;
			}
		} catch {
			// Replace malformed development identity data below.
		}
	}

	const identity = createEditorIdentity();
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
	return identity;
}

export function parseEditorIdentity(value: unknown): EditorIdentity | null {
	const result = editorIdentitySchema.safeParse(value);
	return result.success ? result.data : null;
}

function editorColorForId(id: string): string {
	let hash = 2_166_136_261;
	for (const character of id) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16_777_619);
	}
	const hue = (((hash >>> 0) / 0xff_ff_ff_ff) * 360).toFixed(2);
	return `hsl(${hue}deg 72% 48%)`;
}

function isGuestName(name: string): boolean {
	if (!name.startsWith("Guest ")) {
		return false;
	}
	const suffix = name.slice("Guest ".length);
	const guestNumber = Number(suffix);
	return (
		Number.isInteger(guestNumber) &&
		guestNumber.toString().padStart(4, "0") === suffix
	);
}
