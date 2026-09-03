import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useState } from "react";
import * as Y from "yjs";
import { authClient } from "@/features/auth/auth-client";
import { getSessionEditorIdentity } from "./identity";
import { createLessonDocumentModel, type LessonDocument } from "./model";
import { createCollaborationPresence } from "./presence";
import { createCollaborationStatusStore } from "./status";

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
	const collaborationStatus = createCollaborationStatusStore();
	document.setCollaborationStatus(collaborationStatus);

	const provider = new HocuspocusProvider({
		url,
		name: `lesson:${lessonId}`,
		document: ydoc,
		token: async () => {
			const { data, error } = await authClient.token();
			if (error || !data?.token) {
				throw new Error("Could not authenticate the collaboration connection.");
			}
			return data.token;
		},
		onOpen() {
			collaborationStatus.setTransportStatus("connected");
		},
		onStatus({ status }) {
			collaborationStatus.setTransportStatus(status);
		},
		onSynced({ state }) {
			collaborationStatus.setSynced(state);
			if (state) {
				document.markReady();
			}
		},
		onUnsyncedChanges({ number }) {
			collaborationStatus.setUnsyncedChanges(number);
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
			collaborationStatus.destroy();
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
