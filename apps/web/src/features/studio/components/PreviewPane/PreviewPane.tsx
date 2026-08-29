import type { PresentationHandle } from "@course-studio/presentation";
import type { PresentationTheme } from "@course-studio/themes";
import type { Ref } from "react";
import { PresentationPreview } from "../PresentationPreview";
import styles from "./PreviewPane.module.css";

interface PreviewPaneProps {
	markdown: string;
	theme: PresentationTheme;
	presentationRef: Ref<PresentationHandle>;
}

export function PreviewPane({
	markdown,
	theme,
	presentationRef,
}: PreviewPaneProps) {
	return (
		<section className={styles.pane} aria-labelledby="preview-pane-title">
			<header className={styles.paneHeader}>
				<span id="preview-pane-title">Preview</span>
				<span className={styles.paneMeta}>16:9 canvas</span>
			</header>
			<div className={styles.paneContent}>
				<PresentationPreview
					markdown={markdown}
					theme={theme}
					presentationRef={presentationRef}
				/>
			</div>
		</section>
	);
}
