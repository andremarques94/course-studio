import { z } from "zod";

const STORAGE_KEY = "course-studio:editor-identity";

const editorIdentitySchema = z
	.object({
		id: z.uuid(),
		name: z.string().length(10).refine(isGuestName),
		color: z.string().max(32),
		colorLight: z.string().max(40),
		avatarUrl: z.httpUrl().max(2_048).optional(),
	})
	.refine(
		({ id, color, colorLight }) =>
			color === editorColorForId(id) &&
			colorLight === editorSelectionColorForId(id),
	);

export type EditorIdentity = z.infer<typeof editorIdentitySchema>;

export function createEditorIdentity(): EditorIdentity {
	const id = crypto.randomUUID();
	const guestNumber = crypto.getRandomValues(new Uint16Array(1))[0] % 10_000;

	return {
		id,
		name: `Guest ${guestNumber.toString().padStart(4, "0")}`,
		color: editorColorForId(id),
		colorLight: editorSelectionColorForId(id),
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
	return `hsl(${editorHueForId(id)}deg 72% 48%)`;
}

function editorSelectionColorForId(id: string): string {
	return `hsl(${editorHueForId(id)}deg 72% 48% / 20%)`;
}

function editorHueForId(id: string): string {
	const hash = Array.from(id).reduce(
		(current, character) =>
			Math.imul(current ^ character.charCodeAt(0), 16_777_619),
		2_166_136_261,
	);
	return (((hash >>> 0) / 0xff_ff_ff_ff) * 360).toFixed(2);
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
