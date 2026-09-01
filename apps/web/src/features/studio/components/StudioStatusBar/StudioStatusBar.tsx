import { Braces } from "lucide-react";
import type { EditorIdentity } from "../../document";
import { CollaboratorPresence } from "../CollaboratorPresence";

import styles from "./StudioStatusBar.module.css";

type StudioStatusBarProps = {
	slideCount: number;
	collaborators: readonly EditorIdentity[];
};

export function StudioStatusBar({
	slideCount,
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
				<CollaboratorPresence collaborators={collaborators} />
			</div>
		</footer>
	);
}
