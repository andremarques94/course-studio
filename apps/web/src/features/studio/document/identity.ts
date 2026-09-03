import { z } from "zod";
import type { AuthSession } from "@/features/auth/auth-client";

const avatarUrlSchema = z.httpUrl().max(2_048);

const editorIdentitySchema = z
	.object({
		id: z.string().min(1).max(255),
		name: z.string().trim().min(1).max(100),
		color: z.string().max(32),
		colorLight: z.string().max(40),
		avatarUrl: avatarUrlSchema.optional(),
	})
	.refine(
		({ id, color, colorLight }) =>
			color === editorColorForId(id) &&
			colorLight === editorSelectionColorForId(id),
	);

export type EditorIdentity = z.infer<typeof editorIdentitySchema>;

export function createEditorIdentity(
	user: Pick<AuthSession["user"], "id" | "name" | "image">,
): EditorIdentity {
	const avatarUrl = avatarUrlSchema.safeParse(user.image);

	return {
		id: user.id,
		name: user.name,
		color: editorColorForId(user.id),
		colorLight: editorSelectionColorForId(user.id),
		...(avatarUrl.success ? { avatarUrl: avatarUrl.data } : {}),
	};
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
