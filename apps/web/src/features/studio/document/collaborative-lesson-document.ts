import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useState } from "react";
import * as Y from "yjs";
import { createCollaborationPresence } from "./collaboration-presence";
import { getSessionEditorIdentity } from "./editor-identity";
import type { LessonDocument } from "./lesson-document";

type CollaborativeLessonDocument = LessonDocument & {
	destroy(): void;
};

type CollaborativeLessonDocumentOptions = {
	lessonId: string;
	url: string;
};

export function createCollaborativeLessonDocument({
	lessonId,
	url,
}: CollaborativeLessonDocumentOptions): CollaborativeLessonDocument {
	const ydoc = new Y.Doc();
	const markdown = ydoc.getText("markdown");
	const listeners = new Set<() => void>();
	let markdownSnapshot = markdown.toString();

	const handleMarkdownChange = () => {
		markdownSnapshot = markdown.toString();
		for (const listener of listeners) {
			listener();
		}
	};
	markdown.observe(handleMarkdownChange);

	const provider = new HocuspocusProvider({
		url,
		name: `lesson:${lessonId}`,
		document: ydoc,
	});
	if (!provider.awareness) {
		throw new Error("Collaboration awareness is unavailable.");
	}
	provider.awareness.setLocalStateField("user", getSessionEditorIdentity());
	const presence = createCollaborationPresence(provider.awareness);

	return {
		ydoc,
		markdown,
		presence,
		getMarkdownSnapshot: () => markdownSnapshot,
		subscribeToMarkdown(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		destroy() {
			presence.destroy();
			provider.destroy();
			markdown.unobserve(handleMarkdownChange);
			listeners.clear();
			ydoc.destroy();
		},
	};
}

export function useCollaborativeLessonDocument({
	lessonId,
	url,
}: CollaborativeLessonDocumentOptions): LessonDocument | null {
	const [document, setDocument] = useState<CollaborativeLessonDocument | null>(
		null,
	);

	useEffect(() => {
		let nextDocument: CollaborativeLessonDocument | null = null;
		const connectionTask = window.setTimeout(() => {
			nextDocument = createCollaborativeLessonDocument({ lessonId, url });
			setDocument(nextDocument);
		}, 0);

		return () => {
			window.clearTimeout(connectionTask);
			if (nextDocument) {
				setDocument(null);
				nextDocument.destroy();
			}
		};
	}, [lessonId, url]);

	return document;
}
