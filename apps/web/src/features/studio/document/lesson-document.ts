import type * as Y from "yjs";

export type LessonDocument = {
	readonly ydoc: Y.Doc;
	readonly markdown: Y.Text;
	readonly getMarkdownSnapshot: () => string;
	readonly subscribeToMarkdown: (listener: () => void) => () => void;
};
