import { MarkdownEditor } from "../MarkdownEditor";
import styles from "./EditorPane.module.css";

type EditorPaneProps = {
	value: string;
	onChange: (value: string) => void;
};

export function EditorPane({ value, onChange }: EditorPaneProps) {
	return (
		<section className={styles.pane} aria-labelledby="editor-pane-title">
			<header className={styles.paneHeader}>
				<span id="editor-pane-title">Editor</span>
				<span className={styles.paneMeta}>Markdown</span>
			</header>
			<div className={styles.paneContent}>
				<MarkdownEditor value={value} onChange={onChange} />
			</div>
		</section>
	);
}
