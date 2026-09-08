import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useState } from "react";
import * as Y from "yjs";
import { type AuthSession, authClient } from "@/features/auth/auth-client";
import { createEditorIdentity } from "./identity";
import { createLessonDocumentModel, type LessonDocument } from "./model";
import { createCollaborationPresence } from "./presence";
import { createCollaborationStatusStore } from "./status";

type CollaborativeLessonDocument = LessonDocument & { destroy(): void };
type CollaborationUser = Pick<AuthSession["user"], "id" | "name" | "image">;

type CollaborativeLessonDocumentOptions = {
	lessonId: string;
	onAccessRevoked?: () => void;
	url: string;
	user: CollaborationUser;
};

export function createCollaborativeLessonDocument({
	lessonId,
	onAccessRevoked,
	url,
	user,
}: CollaborativeLessonDocumentOptions): CollaborativeLessonDocument {
	const ydoc = new Y.Doc();
	const document = createLessonDocumentModel(ydoc, false);
	const collaborationStatus = createCollaborationStatusStore();
	document.setCollaborationStatus(collaborationStatus);

	let provider: HocuspocusProvider;
	const revokeAccess = () => {
		collaborationStatus.revokeAccess();
		provider.disconnect();
		onAccessRevoked?.();
	};
	provider = new HocuspocusProvider({
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
		onAuthenticationFailed({ reason }) {
			if (reason === "Lesson access denied.") {
				revokeAccess();
			}
		},
		onOpen() {
			collaborationStatus.setTransportStatus("connected");
		},
		onStatus({ status }) {
			collaborationStatus.setTransportStatus(status);
		},
		onClose({ event }) {
			if (event.code === 4403 || event.reason === "Lesson access revoked.") {
				revokeAccess();
			}
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
	provider.awareness.setLocalStateField("user", createEditorIdentity(user));
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
	onAccessRevoked,
	url,
	user,
}: CollaborativeLessonDocumentOptions): LessonDocument | null {
	const { id, image, name } = user;
	const [document, setDocument] = useState<CollaborativeLessonDocument | null>(
		null,
	);

	useEffect(() => {
		const nextDocument = createCollaborativeLessonDocument({
			lessonId,
			onAccessRevoked,
			url,
			user: { id, image, name },
		});
		setDocument(nextDocument);

		return () => {
			setDocument(null);
			nextDocument.destroy();
		};
	}, [id, image, lessonId, name, onAccessRevoked, url]);

	return document;
}
