import { type BuiltinThemeId, isBuiltinThemeId } from "@course-studio/themes";
import type * as Y from "yjs";
import type { CollaborationPresence } from "./presence";
import type { CollaborationStatusStore } from "./status";

export type LessonDocumentSnapshot = {
	readonly markdown: string;
	readonly themeId: BuiltinThemeId | null;
	readonly ready: boolean;
};

export type LessonDocument = {
	readonly ydoc: Y.Doc;
	readonly markdown: Y.Text;
	readonly presence: CollaborationPresence | null;
	readonly collaborationStatus: CollaborationStatusStore | null;
	readonly getSnapshot: () => LessonDocumentSnapshot;
	readonly subscribe: (listener: () => void) => () => void;
	readonly setThemeId: (themeId: BuiltinThemeId) => void;
};

export type ManagedLessonDocument = LessonDocument & {
	destroy(): void;
	markReady(): void;
	setPresence(presence: CollaborationPresence): void;
	setCollaborationStatus(status: CollaborationStatusStore): void;
};

export function createLessonDocumentModel(
	ydoc: Y.Doc,
	ready: boolean,
): ManagedLessonDocument {
	const markdown = ydoc.getText("markdown");
	const metadata = ydoc.getMap<unknown>("metadata");
	const listeners = new Set<() => void>();
	let collaborationStatus: CollaborationStatusStore | null = null;
	let presence: CollaborationPresence | null = null;
	let snapshot = readSnapshot(markdown, metadata, ready);

	const publish = () => {
		const nextSnapshot = readSnapshot(markdown, metadata, snapshot.ready);
		if (
			nextSnapshot.markdown === snapshot.markdown &&
			nextSnapshot.themeId === snapshot.themeId
		) {
			return;
		}
		snapshot = nextSnapshot;
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
			return presence;
		},
		get collaborationStatus() {
			return collaborationStatus;
		},
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		setThemeId(themeId) {
			metadata.set("themeId", themeId);
		},
		markReady() {
			if (snapshot.ready) {
				return;
			}
			snapshot = { ...snapshot, ready: true };
			for (const listener of listeners) {
				listener();
			}
		},
		setPresence(nextPresence) {
			presence = nextPresence;
		},
		setCollaborationStatus(nextStatus) {
			collaborationStatus = nextStatus;
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
