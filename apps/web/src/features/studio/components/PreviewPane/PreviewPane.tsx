import { PresentationPreview } from "../PresentationPreview";
import styles from "./PreviewPane.module.css";

interface PreviewPaneProps {
	markdown: string;
}

export function PreviewPane({ markdown }: PreviewPaneProps) {
	return (
		<section className={styles.pane} aria-labelledby="preview-pane-title">
			<header className={styles.paneHeader}>
				<span id="preview-pane-title">Preview</span>
				<span className={styles.paneMeta}>16:9 canvas</span>
			</header>
			<div className={styles.paneContent}>
				<PresentationPreview markdown={markdown} />
			</div>
		</section>
	);
}
