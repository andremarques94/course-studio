import { useSyncExternalStore } from "react";
import * as Y from "yjs";

export type DraftStorageStatus = "saved" | "error";

export type DraftStorageStatusStore = {
	getSnapshot(): DraftStorageStatus;
	subscribe(listener: () => void): () => void;
};

export type LessonDraftStorage = {
	load(key: string): Uint8Array | null;
	save(key: string, update: Uint8Array): void;
};

export function createBrowserLessonDraftStorage(
	storage: Pick<Storage, "getItem" | "setItem">,
): LessonDraftStorage {
	return {
		load(key) {
			const encoded = storage.getItem(key);
			if (!encoded) {
				return null;
			}
			const binary = atob(encoded);
			return Uint8Array.from(binary, (character) => character.charCodeAt(0));
		},
		save(key, update) {
			let binary = "";
			for (const byte of update) {
				binary += String.fromCharCode(byte);
			}
			storage.setItem(key, btoa(binary));
		},
	};
}

export function createDraftStorageStatusStore() {
	let status: DraftStorageStatus = "saved";
	const listeners = new Set<() => void>();
	return {
		getSnapshot: () => status,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		setError() {
			if (status === "error") {
				return;
			}
			status = "error";
			for (const listener of listeners) {
				listener();
			}
		},
		destroy() {
			listeners.clear();
		},
	};
}

export function persistLessonDraft({
	document,
	key,
	storage,
	onError,
}: {
	document: Y.Doc;
	key: string;
	storage: LessonDraftStorage;
	onError(): void;
}) {
	let restored = false;
	try {
		const saved = storage.load(key);
		if (saved) {
			Y.applyUpdate(document, saved, "local-draft-restore");
			restored = true;
		}
	} catch {
		onError();
	}

	const save = () => {
		try {
			storage.save(key, Y.encodeStateAsUpdate(document));
		} catch {
			onError();
		}
	};
	document.on("update", save);

	return {
		restored,
		destroy() {
			document.off("update", save);
		},
	};
}

export function lessonDraftStorageKey(userId: string, lessonId: string) {
	return `course-studio:draft:${userId}:${lessonId}`;
}

export function useDraftStorageStatus(
	store: DraftStorageStatusStore | null,
): DraftStorageStatus {
	return useSyncExternalStore(
		store?.subscribe ?? noOpSubscribe,
		store?.getSnapshot ?? savedSnapshot,
		savedSnapshot,
	);
}

const savedSnapshot = (): DraftStorageStatus => "saved";
const noOpSubscribe = () => () => undefined;
