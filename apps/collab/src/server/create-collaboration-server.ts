import { Server } from "@hocuspocus/server";
import type { Logger } from "pino";
import type * as Y from "yjs";
import type { AuthenticateToken } from "../auth/jwt.js";

type CollaborationServerOptions = {
	host: string;
	port: number;
	logger: Logger;
	authenticateToken: AuthenticateToken;
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
	loadDocument,
	storeDocument,
}: CollaborationServerOptions) {
	return new Server({
		address: host,
		debounce: 1_000,
		maxDebounce: 10_000,
		port,
		stopOnSignals: false,
		async onAuthenticate({ token }) {
			if (!token) {
				throw new Error("Authentication token is required.");
			}
			return authenticateToken(token);
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
