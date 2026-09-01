import type * as Y from "yjs";
import type { CollaborationPresence } from "./collaboration-presence";

export type LessonDocument = {
	readonly ydoc: Y.Doc;
	readonly markdown: Y.Text;
	readonly presence: CollaborationPresence | null;
	readonly getMarkdownSnapshot: () => string;
	readonly subscribeToMarkdown: (listener: () => void) => () => void;
};
