import { useHotkey } from "@tanstack/react-hotkeys";
import { useDeferredValue, useState } from "react";

import { INITIAL_MARKDOWN } from "../../initial-markdown";
import { MarkdownEditor } from "../MarkdownEditor";
import { PresentationPreview } from "../PresentationPreview";
import { StudioToolbar } from "../StudioToolbar";
import styles from "./Studio.module.css";

export function Studio() {
	const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
	const [previewFullscreen, setPreviewFullscreen] = useState(false);
	const previewMarkdown = useDeferredValue(markdown);

	useHotkey(
		"Mod+Shift+P",
		() => {
			setPreviewFullscreen((current) => !current);
		},
		{ stopPropagation: false },
	);

	return (
		<div className={styles.studio}>
			<StudioToolbar />

			<main
				className={
					previewFullscreen
						? `${styles.workspace} ${styles.previewWorkspace}`
						: styles.workspace
				}
			>
				<section className={`${styles.pane} ${styles.editor}`}>
					<div className={styles.paneHeader}>Markdown</div>

					<div className={styles.paneContent}>
						<MarkdownEditor value={markdown} onChange={setMarkdown} />
					</div>
				</section>

				<section className={styles.pane}>
					<div className={styles.paneHeader}>Preview</div>

					<div className={styles.paneContent}>
						<PresentationPreview markdown={previewMarkdown} />
					</div>
				</section>
			</main>
		</div>
	);
}
