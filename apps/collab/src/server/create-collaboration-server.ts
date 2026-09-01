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
};

export function createCollaborationServer({
	host,
	port,
	logger,
	loadDocument,
}: CollaborationServerOptions) {
	return new Server({
		address: host,
		port,
		async onAuthenticate() {
			// Milestone 7B is intentionally development-only. Replace this hook with
			// token validation and lesson-level authorization before public exposure.
			return {};
		},
		onLoadDocument: loadDocument,
		async onConnect({ documentName }) {
			logger.info({ documentName }, "collaboration client connected");
		},
		async onDisconnect({ documentName }) {
			logger.info({ documentName }, "collaboration client disconnected");
		},
	});
}
