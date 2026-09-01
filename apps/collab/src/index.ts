import { createDatabase } from "@course-studio/db";
import pino from "pino";
import { loadEnv } from "./config/env.js";
import { createLessonDocumentLoader } from "./documents/lesson-document-loader.js";
import {
	createLessonDocumentPersistence,
	createPostgresLessonDocumentStore,
} from "./documents/lesson-document-persistence.js";
import { createCollaborationServer } from "./server/create-collaboration-server.js";

const env = loadEnv();
const logger = pino({ level: env.logLevel });
const db = createDatabase(env.databaseUrl);
const initializeDocument = createLessonDocumentLoader({ apiUrl: env.apiUrl });
const persistence = createLessonDocumentPersistence({
	store: createPostgresLessonDocumentStore(db),
	initializeDocument,
});
const server = createCollaborationServer({
	host: env.host,
	port: env.port,
	logger,
	loadDocument: persistence.load,
	storeDocument: persistence.store,
});

await server.listen();
logger.info(
	{ host: env.host, port: env.port },
	"development collaboration server listening",
);

let isShuttingDown = false;

async function shutdown() {
	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;
	logger.info("development collaboration server stopping");

	try {
		server.hocuspocus.flushPendingStores();
		await server.destroy();
		await db.$client.end();
		logger.info("development collaboration server stopped");
	} catch (error) {
		logger.error({ err: error }, "collaboration server shutdown failed");
		process.exitCode = 1;
	}
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
