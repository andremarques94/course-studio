import { Server } from "@hocuspocus/server";
import type { Logger } from "pino";
import type * as Y from "yjs";
import type { AuthenticateToken } from "../auth/jwt.js";
import { parseLessonDocumentName } from "../documents/lesson-document-loader.js";

type CollaborationServerOptions = {
	host: string;
	port: number;
	logger: Logger;
	authenticateToken: AuthenticateToken;
	authorizeLesson(userId: string, lessonId: string): Promise<boolean>;
	loadDocument(input: {
		document: Y.Doc;
		documentName: string;
	}): Promise<Y.Doc>;
	storeDocument(input: {
		document: Y.Doc;
		documentName: string;
	}): Promise<void>;
};

export function createCollaborationServer({
	host,
	port,
	logger,
	authenticateToken,
	authorizeLesson,
	loadDocument,
	storeDocument,
}: CollaborationServerOptions) {
	return new Server({
		address: host,
		debounce: 1_000,
		maxDebounce: 10_000,
		port,
		stopOnSignals: false,
		async onAuthenticate({ documentName, token }) {
			if (!token) {
				throw new Error("Authentication token is required.");
			}
			const connection = await authenticateToken(token);
			const lessonId = parseLessonDocumentName(documentName);
			if (!(await authorizeLesson(connection.userId, lessonId))) {
				throw new Error("Lesson not found.");
			}
			return connection;
		},
		onLoadDocument: loadDocument,
		onStoreDocument: storeDocument,
		async onConnect({ documentName }) {
			logger.info({ documentName }, "collaboration client connected");
		},
		async onDisconnect({ documentName }) {
			logger.info({ documentName }, "collaboration client disconnected");
		},
	});
}
