import {
	javascriptLanguage,
	jsxLanguage,
	tsxLanguage,
	typescriptLanguage,
} from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";

import styles from "./MarkdownEditor.module.css";

type MarkdownEditorProps = {
	value: string;
	onChange: (value: string) => void;
};

const basicSetup = {
	lineNumbers: true,
	foldGutter: false,
	highlightActiveLine: true,
	highlightActiveLineGutter: false,
};

const highlightStyle = HighlightStyle.define([
	{
		tag: [tags.heading, tags.keyword, tags.typeName, tags.tagName],
		color: "var(--editor-syntax-accent)",
	},
	{
		tag: [tags.string, tags.attributeValue, tags.link, tags.url],
		color: "var(--editor-syntax-detail)",
	},
	{
		tag: [
			tags.number,
			tags.bool,
			tags.null,
			tags.monospace,
			tags.function(tags.variableName),
		],
		color: "var(--editor-syntax-soft)",
	},
	{
		tag: [
			tags.meta,
			tags.punctuation,
			tags.contentSeparator,
			tags.operator,
			tags.bracket,
		],
		color: "var(--editor-syntax-muted)",
	},
	{
		tag: tags.comment,
		color: "var(--editor-syntax-faint)",
		fontStyle: "italic",
	},
	{ tag: tags.heading, fontWeight: "650" },
	{ tag: tags.strong, fontWeight: "650" },
	{ tag: tags.emphasis, fontStyle: "italic" },
	{
		tag: tags.invalid,
		color: "var(--color-destructive)",
		textDecoration: "underline wavy",
	},
]);

function codeLanguage(info: string) {
	const [language] = info.trim().toLowerCase().split(/\s+/, 1);

	switch (language) {
		case "js":
		case "javascript":
			return javascriptLanguage;
		case "jsx":
			return jsxLanguage;
		case "ts":
		case "typescript":
			return typescriptLanguage;
		case "tsx":
			return tsxLanguage;
		default:
			return null;
	}
}

const extensions = [
	markdown({ codeLanguages: codeLanguage }),
	syntaxHighlighting(highlightStyle),
];

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
	return (
		<div className={styles.editor}>
			<CodeMirror
				value={value}
				height="100%"
				extensions={extensions}
				onChange={onChange}
				basicSetup={basicSetup}
			/>
		</div>
	);
}
