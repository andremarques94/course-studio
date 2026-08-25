import { markdown } from "@codemirror/lang-markdown";
import CodeMirror from "@uiw/react-codemirror";

import styles from "./MarkdownEditor.module.css";

interface MarkdownEditorProps {
	value: string;
	onChange: (value: string) => void;
}

const basicSetup = {
	lineNumbers: true,
	foldGutter: false,
	highlightActiveLine: true,
	highlightActiveLineGutter: false,
};

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
	return (
		<div className={styles.editor}>
			<CodeMirror
				value={value}
				height="100%"
				extensions={[markdown()]}
				onChange={onChange}
				basicSetup={basicSetup}
			/>
		</div>
	);
}
