import { Server } from "@hocuspocus/server";
import type { Logger } from "pino";
import type * as Y from "yjs";
import type { AuthenticateToken } from "../auth/jwt.js";
import { parseLessonDocumentName } from "../documents/lesson-document-loader.js";

type CollaborationContext = Readonly<{ userId: string }>;

const LESSON_ACCESS_REVOKED = {
	code: 4403,
	reason: "Lesson access revoked.",
} as const;

const LESSON_ACCESS_DENIED = {
	code: 4403,
	reason: "Lesson access denied.",
} as const;

const LESSON_AUTHORIZATION_UNAVAILABLE = {
	code: 1011,
	reason: "Lesson authorization unavailable.",
} as const;

type CollaborationServerOptions = {
	host: string;
	port: number;
	authRevalidationIntervalMs?: number;
	authRevalidationTimeoutMs?: number;
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

function requireAuthenticatedUserId(context: unknown): string {
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
	authRevalidationIntervalMs = 5_000,
	authRevalidationTimeoutMs = 5_000,
	logger,
	authenticateToken,
	authorizeLesson,
	loadDocument,
	storeDocument,
}: CollaborationServerOptions) {
	if (
		!Number.isInteger(authRevalidationIntervalMs) ||
		authRevalidationIntervalMs <= 0 ||
		!Number.isInteger(authRevalidationTimeoutMs) ||
		authRevalidationTimeoutMs <= 0
	) {
		throw new Error("Authorization revalidation timings must be positive.");
	}

	const revalidationTimers = new Set<ReturnType<typeof setTimeout>>();
	const pendingAuthorizationChecks = new WeakMap<object, Promise<boolean>>();
	let isDestroying = false;
	const authorizeConnection = (
		connection: object,
		userId: string,
		lessonId: string,
	) => {
		const pending = pendingAuthorizationChecks.get(connection);
		if (pending) {
			return pending;
		}

		const current = Promise.resolve().then(() =>
			authorizeLesson(userId, lessonId),
		);
		pendingAuthorizationChecks.set(connection, current);
		void current.then(
			() => {
				if (pendingAuthorizationChecks.get(connection) === current) {
					pendingAuthorizationChecks.delete(connection);
				}
			},
			() => {
				if (pendingAuthorizationChecks.get(connection) === current) {
					pendingAuthorizationChecks.delete(connection);
				}
			},
		);
		return current;
	};

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
				throw Object.assign(
					new Error(LESSON_ACCESS_DENIED.reason),
					LESSON_ACCESS_DENIED,
				);
			}
			return { userId };
		},
		async beforeHandleMessage({ connection, context, documentName }) {
			const userId = requireAuthenticatedUserId(context);
			const lessonId = parseLessonDocumentName(documentName);
			if (await authorizeConnection(connection, userId, lessonId)) {
				return;
			}

			// Revocation is enforced before Hocuspocus can apply or persist this message.
			connection.close(LESSON_ACCESS_REVOKED);
			throw Object.assign(
				new Error(LESSON_ACCESS_REVOKED.reason),
				LESSON_ACCESS_REVOKED,
			);
		},
		onLoadDocument: loadDocument,
		onStoreDocument: storeDocument,
		async connected({ connection, context, documentName }) {
			const userId = requireAuthenticatedUserId(context);
			const lessonId = parseLessonDocumentName(documentName);
			let intervalTimer: ReturnType<typeof setTimeout> | undefined;
			let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
			let isActive = true;

			const clearTimer = (timer: ReturnType<typeof setTimeout> | undefined) => {
				if (timer) {
					clearTimeout(timer);
					revalidationTimers.delete(timer);
				}
			};
			const stopRevalidation = () => {
				isActive = false;
				clearTimer(intervalTimer);
				clearTimer(deadlineTimer);
				intervalTimer = undefined;
				deadlineTimer = undefined;
			};
			const scheduleRevalidation = () => {
				if (!isActive || isDestroying) {
					return;
				}
				intervalTimer = setTimeout(() => {
					if (intervalTimer) {
						revalidationTimers.delete(intervalTimer);
						intervalTimer = undefined;
					}
					void revalidate();
				}, authRevalidationIntervalMs);
				revalidationTimers.add(intervalTimer);
			};
			const revalidate = async () => {
				deadlineTimer = setTimeout(() => {
					if (deadlineTimer) {
						revalidationTimers.delete(deadlineTimer);
						deadlineTimer = undefined;
					}
					if (!isActive || isDestroying) {
						return;
					}
					logger.error(
						{ documentName, userId },
						"lesson access revalidation timed out",
					);
					stopRevalidation();
					connection.close(LESSON_AUTHORIZATION_UNAVAILABLE);
				}, authRevalidationTimeoutMs);
				revalidationTimers.add(deadlineTimer);

				try {
					const isAuthorized = await authorizeConnection(
						connection,
						userId,
						lessonId,
					);
					clearTimer(deadlineTimer);
					deadlineTimer = undefined;
					if (!isActive || isDestroying) {
						return;
					}
					if (!isAuthorized) {
						stopRevalidation();
						connection.close(LESSON_ACCESS_REVOKED);
						return;
					}
				} catch (error) {
					clearTimer(deadlineTimer);
					deadlineTimer = undefined;
					if (!isActive || isDestroying) {
						return;
					}
					logger.error(
						{ err: error, documentName, userId },
						"lesson access revalidation failed",
					);
					stopRevalidation();
					connection.close(LESSON_AUTHORIZATION_UNAVAILABLE);
					return;
				}

				scheduleRevalidation();
			};

			connection.onClose(stopRevalidation);
			scheduleRevalidation();
		},
		async onConnect({ documentName }) {
			logger.info({ documentName }, "collaboration client connected");
		},
		async onDisconnect({ documentName }) {
			logger.info({ documentName }, "collaboration client disconnected");
		},
		async onDestroy() {
			isDestroying = true;
			for (const timer of revalidationTimers) {
				clearTimeout(timer);
			}
			revalidationTimers.clear();
		},
	});
}
