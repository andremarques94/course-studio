import { Braces } from "lucide-react";
import {
	type CollaborationStatus,
	type DraftStorageStatusStore,
	type EditorIdentity,
	useDraftStorageStatus,
} from "../../document";
import { CollaboratorPresence } from "../CollaboratorPresence";

import styles from "./StudioStatusBar.module.css";

type StudioStatusBarProps = {
	slideCount: number;
	collaborationStatus: CollaborationStatus;
	collaborators: readonly EditorIdentity[];
	draftStorageStatus: DraftStorageStatusStore | null;
	onRetry: (() => void) | null;
};

const collaborationStatusLabels: Record<CollaborationStatus, string> = {
	connecting: "Network connecting",
	connected: "Network connected",
	syncing: "Network syncing",
	synced: "Network synced",
	offline: "Network offline",
	"auth-failed": "Authentication failed",
};

export function StudioStatusBar({
	slideCount,
	collaborationStatus,
	collaborators,
	draftStorageStatus,
	onRetry,
}: StudioStatusBarProps) {
	const storageStatus = useDraftStorageStatus(draftStorageStatus);
	return (
		<footer className={styles.statusBar}>
			<span className={styles.statusItem}>
				<Braces aria-hidden="true" />
				Markdown
			</span>
			<span className={styles.slideCount}>
				{slideCount} {slideCount === 1 ? "slide" : "slides"}
			</span>
			<div className={styles.presence}>
				<span className={styles.aspectRatio}>16:9</span>
				<output
					className={styles.storageStatus}
					data-status={storageStatus}
					aria-live="polite"
				>
					{storageStatus === "saved"
						? "Saved on this device"
						: "Local save failed"}
				</output>
				<output
					className={styles.collaborationStatus}
					data-status={collaborationStatus}
					aria-live="polite"
					aria-atomic="true"
				>
					<span className={styles.statusDot} aria-hidden="true" />
					{collaborationStatusLabels[collaborationStatus]}
				</output>
				{collaborationStatus === "auth-failed" && onRetry && (
					<button type="button" className={styles.retry} onClick={onRetry}>
						Retry
					</button>
				)}
				<CollaboratorPresence collaborators={collaborators} />
			</div>
		</footer>
	);
}
