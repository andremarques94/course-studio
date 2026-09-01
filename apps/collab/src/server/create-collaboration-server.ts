import { Server } from "@hocuspocus/server";
import type { Logger } from "pino";
import type * as Y from "yjs";

type CollaborationServerOptions = {
	host: string;
	port: number;
	logger: Logger;
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
	loadDocument,
	storeDocument,
}: CollaborationServerOptions) {
	return new Server({
		address: host,
		debounce: 1_000,
		maxDebounce: 10_000,
		port,
		stopOnSignals: false,
		async onAuthenticate() {
			// Milestone 7B is intentionally development-only. Replace this hook with
			// token validation and lesson-level authorization before public exposure.
			return {};
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
