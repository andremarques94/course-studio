import type * as Y from "yjs";
import { MarkdownEditor } from "../MarkdownEditor";
import styles from "./EditorPane.module.css";

type EditorPaneProps = {
	markdown: Y.Text;
};

export function EditorPane({ markdown }: EditorPaneProps) {
	return (
		<section className={styles.pane} aria-labelledby="editor-pane-title">
			<header className={styles.paneHeader}>
				<span id="editor-pane-title">Editor</span>
				<span className={styles.paneMeta}>Markdown</span>
			</header>
			<div className={styles.paneContent}>
				<MarkdownEditor markdown={markdown} />
			</div>
		</section>
	);
}
