const host = "127.0.0.1";
const ports = {
	web: e2ePort("E2E_WEB_PORT", 3000),
	api: e2ePort("E2E_API_PORT", 3001),
	collaboration: e2ePort("E2E_COLLABORATION_PORT", 3002),
} as const;

export const e2eEnvironment = {
	host,
	ports,
	urls: {
		web: `http://${host}:${ports.web}`,
		api: `http://${host}:${ports.api}`,
		collaboration: `ws://${host}:${ports.collaboration}`,
	},
	mailpit: process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:8025",
} as const;

function e2ePort(name: string, fallback: number) {
	const value = Number(process.env[name] ?? fallback);
	if (!Number.isInteger(value) || value < 1 || value > 65_535) {
		throw new Error(`${name} must be a valid TCP port`);
	}
	return value;
}
