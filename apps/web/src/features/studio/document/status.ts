import { useSyncExternalStore } from "react";

export type CollaborationStatus =
	| "connecting"
	| "connected"
	| "syncing"
	| "synced"
	| "offline";

export type CollaborationStatusStore = {
	readonly getSnapshot: () => CollaborationStatus;
	readonly subscribe: (listener: () => void) => () => void;
};

type TransportStatus = "connecting" | "connected" | "disconnected";

type CollaborationStatusStoreOptions = {
	syncedSettleDelayMs?: number;
};

type CollaborationStatusState = {
	status: CollaborationStatus;
	synced: boolean;
	transportStatus: TransportStatus;
	unsyncedChanges: number;
};

const DEFAULT_SYNCED_SETTLE_DELAY_MS = 400;

export function createCollaborationStatusStore({
	syncedSettleDelayMs = DEFAULT_SYNCED_SETTLE_DELAY_MS,
}: CollaborationStatusStoreOptions = {}): CollaborationStatusStore & {
	destroy(): void;
	setSynced(synced: boolean): void;
	setTransportStatus(status: TransportStatus): void;
	setUnsyncedChanges(count: number): void;
} {
	const listeners = new Set<() => void>();
	let syncedTimer: ReturnType<typeof setTimeout> | null = null;
	const state: CollaborationStatusState = {
		status: "connecting",
		synced: false,
		transportStatus: "connecting",
		unsyncedChanges: 0,
	};

	const clearSyncedTimer = () => {
		if (syncedTimer !== null) {
			clearTimeout(syncedTimer);
			syncedTimer = null;
		}
	};

	const commit = (nextStatus: CollaborationStatus) => {
		if (nextStatus === state.status) {
			return;
		}
		state.status = nextStatus;
		for (const listener of listeners) {
			listener();
		}
	};

	const publish = () => {
		const nextStatus = deriveStatus(state);
		const shouldSettle =
			nextStatus === "synced" &&
			state.status === "syncing" &&
			syncedSettleDelayMs > 0;

		if (!shouldSettle) {
			clearSyncedTimer();
			commit(nextStatus);
			return;
		}

		syncedTimer ??= setTimeout(() => {
			syncedTimer = null;
			commit(deriveStatus(state));
		}, syncedSettleDelayMs);
	};

	return {
		getSnapshot: () => state.status,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		setSynced(synced) {
			state.synced = synced;
			publish();
		},
		setTransportStatus(status) {
			state.transportStatus = status;
			if (status === "disconnected") {
				state.synced = false;
			}
			publish();
		},
		setUnsyncedChanges(count) {
			state.unsyncedChanges = Math.max(0, count);
			publish();
		},
		destroy() {
			clearSyncedTimer();
			listeners.clear();
		},
	};
}

export function useCollaborationStatus(
	store: CollaborationStatusStore | null,
): CollaborationStatus {
	return useSyncExternalStore(
		store?.subscribe ?? noOpSubscribe,
		store?.getSnapshot ?? offlineSnapshot,
		offlineSnapshot,
	);
}

function deriveStatus({
	transportStatus,
	synced,
	unsyncedChanges,
}: {
	transportStatus: TransportStatus;
	synced: boolean;
	unsyncedChanges: number;
}): CollaborationStatus {
	switch (transportStatus) {
		case "disconnected":
			return "offline";
		case "connecting":
			return "connecting";
		case "connected":
			if (unsyncedChanges > 0) {
				return "syncing";
			}
			return synced ? "synced" : "connected";
	}
}

const offlineSnapshot = (): CollaborationStatus => "offline";
const noOpSubscribe = () => () => undefined;
