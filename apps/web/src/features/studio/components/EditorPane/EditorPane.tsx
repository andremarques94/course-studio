import type * as Y from "yjs";
import type { CollaborationPresence } from "../../document";
import { MarkdownEditor } from "../MarkdownEditor";
import styles from "./EditorPane.module.css";

type EditorPaneProps = {
	markdown: Y.Text;
	presence: CollaborationPresence | null;
};

export function EditorPane({ markdown, presence }: EditorPaneProps) {
	return (
		<section className={styles.pane} aria-labelledby="editor-pane-title">
			<header className={styles.paneHeader}>
				<span id="editor-pane-title">Editor</span>
				<span className={styles.paneMeta}>Markdown</span>
			</header>
			<div className={styles.paneContent}>
				<MarkdownEditor markdown={markdown} presence={presence} />
			</div>
		</section>
	);
}
