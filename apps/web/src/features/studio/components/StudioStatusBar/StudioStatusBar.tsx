import { Braces } from "lucide-react";
import type { CollaborationStatus, EditorIdentity } from "../../document";
import { CollaboratorPresence } from "../CollaboratorPresence";

import styles from "./StudioStatusBar.module.css";

type StudioStatusBarProps = {
	slideCount: number;
	collaborationStatus: CollaborationStatus;
	collaborators: readonly EditorIdentity[];
};

const collaborationStatusLabels: Record<CollaborationStatus, string> = {
	connecting: "Connecting",
	connected: "Connected",
	syncing: "Syncing",
	synced: "Synced",
	offline: "Offline",
};

export function StudioStatusBar({
	slideCount,
	collaborationStatus,
	collaborators,
}: StudioStatusBarProps) {
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
					className={styles.collaborationStatus}
					data-status={collaborationStatus}
					aria-live="polite"
					aria-atomic="true"
				>
					<span className={styles.statusDot} aria-hidden="true" />
					{collaborationStatusLabels[collaborationStatus]}
				</output>
				<CollaboratorPresence collaborators={collaborators} />
			</div>
		</footer>
	);
}
