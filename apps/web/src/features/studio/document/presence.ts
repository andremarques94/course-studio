import { useSyncExternalStore } from "react";
import type { Awareness } from "y-protocols/awareness";
import { type EditorIdentity, parseEditorIdentity } from "./identity";

export type CollaborationPresence = {
	readonly awareness: Awareness;
	readonly getSnapshot: () => readonly EditorIdentity[];
	readonly subscribe: (listener: () => void) => () => void;
};

export function createCollaborationPresence(
	awareness: Awareness,
): CollaborationPresence & { destroy(): void } {
	const state = { snapshot: readCollaborators(awareness) };
	const listeners = new Set<() => void>();
	const handleChange = () => {
		state.snapshot = readCollaborators(awareness);
		for (const listener of listeners) {
			listener();
		}
	};

	awareness.on("change", handleChange);

	return {
		awareness,
		getSnapshot: () => state.snapshot,
		destroy() {
			awareness.off("change", handleChange);
			listeners.clear();
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export function useCollaborators(
	presence: CollaborationPresence | null,
): readonly EditorIdentity[] {
	return useSyncExternalStore(
		presence?.subscribe ?? noOpSubscribe,
		presence?.getSnapshot ?? emptySnapshot,
		emptySnapshot,
	);
}

function readCollaborators(awareness: Awareness): readonly EditorIdentity[] {
	const collaborators = new Map<string, EditorIdentity>();
	for (const state of awareness.getStates().values()) {
		const identity = parseEditorIdentity(state.user);
		if (identity) {
			collaborators.set(identity.id, identity);
		}
	}
	return [...collaborators.values()].sort((a, b) =>
		a.name.localeCompare(b.name),
	);
}

const EMPTY_COLLABORATORS: readonly EditorIdentity[] = [];
const emptySnapshot = () => EMPTY_COLLABORATORS;
const noOpSubscribe = () => () => undefined;
