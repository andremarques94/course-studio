import { type BuiltinThemeId, isBuiltinThemeId } from "@course-studio/themes";
import type * as Y from "yjs";
import type { CollaborationPresence } from "./presence";

export type LessonDocumentSnapshot = {
	readonly markdown: string;
	readonly themeId: BuiltinThemeId | null;
	readonly ready: boolean;
};

export type LessonDocument = {
	readonly ydoc: Y.Doc;
	readonly markdown: Y.Text;
	readonly presence: CollaborationPresence | null;
	readonly getSnapshot: () => LessonDocumentSnapshot;
	readonly subscribe: (listener: () => void) => () => void;
	readonly setThemeId: (themeId: BuiltinThemeId) => void;
};

export type ManagedLessonDocument = LessonDocument & {
	destroy(): void;
	markReady(): void;
	setPresence(presence: CollaborationPresence): void;
};

export function createLessonDocumentModel(
	ydoc: Y.Doc,
	ready: boolean,
): ManagedLessonDocument {
	const markdown = ydoc.getText("markdown");
	const metadata = ydoc.getMap<unknown>("metadata");
	const listeners = new Set<() => void>();
	const state = {
		presence: null as CollaborationPresence | null,
		snapshot: readSnapshot(markdown, metadata, ready),
	};

	const publish = () => {
		const nextSnapshot = readSnapshot(markdown, metadata, state.snapshot.ready);
		if (
			nextSnapshot.markdown === state.snapshot.markdown &&
			nextSnapshot.themeId === state.snapshot.themeId &&
			nextSnapshot.ready === state.snapshot.ready
		) {
			return;
		}
		state.snapshot = nextSnapshot;
		for (const listener of listeners) {
			listener();
		}
	};

	markdown.observe(publish);
	metadata.observe(publish);

	return {
		ydoc,
		markdown,
		get presence() {
			return state.presence;
		},
		getSnapshot: () => state.snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		setThemeId(themeId) {
			metadata.set("themeId", themeId);
		},
		markReady() {
			if (state.snapshot.ready) {
				return;
			}
			state.snapshot = { ...state.snapshot, ready: true };
			for (const listener of listeners) {
				listener();
			}
		},
		setPresence(nextPresence) {
			state.presence = nextPresence;
		},
		destroy() {
			markdown.unobserve(publish);
			metadata.unobserve(publish);
			listeners.clear();
			ydoc.destroy();
		},
	};
}

function readSnapshot(
	markdown: Y.Text,
	metadata: Y.Map<unknown>,
	ready: boolean,
): LessonDocumentSnapshot {
	const themeId = metadata.get("themeId");
	return {
		markdown: markdown.toString(),
		themeId: isBuiltinThemeId(themeId) ? themeId : null,
		ready,
	};
}
