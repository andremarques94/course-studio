import type { PresentationHandle } from "@course-studio/presentation";
import type { PresentationTheme } from "@course-studio/themes";
import type { Ref } from "react";
import { PresentationPreview } from "../PresentationPreview";
import styles from "./PreviewPane.module.css";

type PreviewPaneProps = {
	markdown: string;
	theme: PresentationTheme;
	presentationRef: Ref<PresentationHandle>;
	focused?: boolean;
};

export function PreviewPane({
	markdown,
	theme,
	presentationRef,
	focused = false,
}: PreviewPaneProps) {
	return (
		<section
			className={styles.pane}
			aria-label={focused ? "Presentation" : undefined}
			aria-labelledby={focused ? undefined : "preview-pane-title"}
			data-focused={focused}
		>
			{focused ? null : (
				<header className={styles.paneHeader}>
					<span id="preview-pane-title">Preview</span>
					<span className={styles.paneMeta}>16:9 canvas</span>
				</header>
			)}
			<div className={styles.paneContent}>
				<PresentationPreview
					markdown={markdown}
					theme={theme}
					presentationRef={presentationRef}
					focused={focused}
				/>
			</div>
		</section>
	);
}
