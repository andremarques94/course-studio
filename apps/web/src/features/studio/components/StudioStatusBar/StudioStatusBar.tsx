import { Braces } from "lucide-react";

import styles from "./StudioStatusBar.module.css";

interface StudioStatusBarProps {
	slideCount: number;
}

export function StudioStatusBar({ slideCount }: StudioStatusBarProps) {
	return (
		<footer className={styles.statusBar}>
			<span className={styles.statusItem}>
				<Braces aria-hidden="true" />
				Markdown
			</span>
			<span className={styles.slideCount}>
				{slideCount} {slideCount === 1 ? "slide" : "slides"}
			</span>
			<span className={styles.statusItem}>16:9</span>
		</footer>
	);
}
