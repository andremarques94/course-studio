import { useEffect, useState } from "react";
import * as Y from "yjs";
import type { LessonDocument } from "./lesson-document";

type LocalLessonDocument = LessonDocument & {
	destroy(): void;
};

export function createLocalLessonDocument(
	initialMarkdown: string,
): LocalLessonDocument {
	const ydoc = new Y.Doc();
	const markdown = ydoc.getText("markdown");
	const listeners = new Set<() => void>();
	let markdownSnapshot = "";

	if (initialMarkdown.length > 0) {
		markdown.insert(0, initialMarkdown);
	}
	markdownSnapshot = markdown.toString();

	const handleMarkdownChange = () => {
		markdownSnapshot = markdown.toString();
		for (const listener of listeners) {
			listener();
		}
	};
	markdown.observe(handleMarkdownChange);

	return {
		ydoc,
		markdown,
		getMarkdownSnapshot: () => markdownSnapshot,
		subscribeToMarkdown(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		destroy() {
			markdown.unobserve(handleMarkdownChange);
			listeners.clear();
			ydoc.destroy();
		},
	};
}

export function useLocalLessonDocument(
	initialMarkdown: string,
): LessonDocument {
	const [document] = useState(() => createLocalLessonDocument(initialMarkdown));

	useEffect(() => () => document.destroy(), [document]);

	return document;
}
