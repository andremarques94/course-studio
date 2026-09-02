import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useState } from "react";
import * as Y from "yjs";
import { getSessionEditorIdentity } from "./identity";
import { createLessonDocumentModel, type LessonDocument } from "./model";
import { createCollaborationPresence } from "./presence";

type CollaborativeLessonDocument = LessonDocument & { destroy(): void };

type CollaborativeLessonDocumentOptions = {
	lessonId: string;
	url: string;
};

export function createCollaborativeLessonDocument({
	lessonId,
	url,
}: CollaborativeLessonDocumentOptions): CollaborativeLessonDocument {
	const ydoc = new Y.Doc();
	const document = createLessonDocumentModel(ydoc, false);

	const provider = new HocuspocusProvider({
		url,
		name: `lesson:${lessonId}`,
		document: ydoc,
		onSynced() {
			document.markReady();
		},
	});
	if (!provider.awareness) {
		throw new Error("Collaboration awareness is unavailable.");
	}
	provider.awareness.setLocalStateField("user", getSessionEditorIdentity());
	const presence = createCollaborationPresence(provider.awareness);
	document.setPresence(presence);
	const destroyDocument = document.destroy;

	return {
		...document,
		presence,
		destroy() {
			presence.destroy();
			provider.destroy();
			destroyDocument();
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
		const nextDocument = createCollaborativeLessonDocument({ lessonId, url });
		setDocument(nextDocument);

		return () => {
			setDocument(null);
			nextDocument.destroy();
		};
	}, [lessonId, url]);

	return document;
}
