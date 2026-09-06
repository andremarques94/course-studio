import pino from "pino";

type LogContext = Record<string, unknown>;

export type Logger = {
	info(context: LogContext, message: string): void;
	error(context: LogContext, message: string): void;
};

export function createLogger(level: string): Logger {
	const logger = pino({
		level,
		base: { service: "course-studio-api" },
		timestamp: pino.stdTimeFunctions.isoTime,
		redact: {
			paths: ["authorization", "cookie", "password", "token"],
			censor: "[Redacted]",
		},
	});

	return {
		info(context, message) {
			logger.info(context, message);
		},
		error(context, message) {
			logger.error(context, message);
		},
	};
}
