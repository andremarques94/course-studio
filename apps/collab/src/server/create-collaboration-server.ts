import { Server } from "@hocuspocus/server";
import type { Logger } from "pino";
import type * as Y from "yjs";
import type { AuthenticateToken } from "../auth/jwt.js";
import { parseLessonDocumentName } from "../documents/lesson-document-loader.js";

export type CollaborationContext = Readonly<{ userId: string }>;

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

export function requireAuthenticatedUserId(context: unknown): string {
	if (
		typeof context !== "object" ||
		context === null ||
		!("userId" in context) ||
		typeof context.userId !== "string" ||
		context.userId.length === 0
	) {
		throw new Error("Authenticated collaboration context is missing a userId.");
	}

	return context.userId;
}

export function createCollaborationServer({
	host,
	port,
	logger,
	authenticateToken,
	authorizeLesson,
	loadDocument,
	storeDocument,
}: CollaborationServerOptions) {
	return new Server<CollaborationContext>({
		address: host,
		debounce: 1_000,
		maxDebounce: 10_000,
		port,
		stopOnSignals: false,
		async onAuthenticate({ documentName, token }) {
			if (!token) {
				throw new Error("Authentication token is required.");
			}
			const userId = requireAuthenticatedUserId(await authenticateToken(token));
			const lessonId = parseLessonDocumentName(documentName);
			if (!(await authorizeLesson(userId, lessonId))) {
				throw new Error("Lesson not found.");
			}
			return { userId };
		},
		async beforeHandleMessage({ connection, context, documentName }) {
			const userId = requireAuthenticatedUserId(context);
			const lessonId = parseLessonDocumentName(documentName);
			if (await authorizeLesson(userId, lessonId)) {
				return;
			}

			// Revocation is enforced before Hocuspocus can apply or persist this message.
			const rejection = {
				code: 4403,
				reason: "Lesson access revoked.",
			};
			connection.close(rejection);
			throw Object.assign(new Error(rejection.reason), rejection);
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
