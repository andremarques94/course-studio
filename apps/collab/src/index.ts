import pino from "pino";
import { loadEnv } from "./config/env.js";
import { createLessonDocumentLoader } from "./documents/lesson-document-loader.js";
import { createCollaborationServer } from "./server/create-collaboration-server.js";

const env = loadEnv();
const logger = pino({ level: env.logLevel });
const loadDocument = createLessonDocumentLoader({ apiUrl: env.apiUrl });
const server = createCollaborationServer({
	host: env.host,
	port: env.port,
	logger,
	loadDocument,
});

await server.listen();
logger.info(
	{ host: env.host, port: env.port },
	"development collaboration server listening",
);
