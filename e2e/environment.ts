const host = "127.0.0.1";
const ports = {
	web: 3000,
	api: 3001,
	collaboration: 3002,
} as const;

export const e2eEnvironment = {
	host,
	ports,
	urls: {
		web: `http://${host}:${ports.web}`,
		api: `http://${host}:${ports.api}`,
		collaboration: `ws://${host}:${ports.collaboration}`,
	},
} as const;
