function parseCollaborationUrl(value: string | undefined) {
	if (!value) {
		throw new Error("VITE_COLLAB_URL is required.");
	}

	const url = new URL(value);
	if (url.protocol !== "ws:" && url.protocol !== "wss:") {
		throw new Error("VITE_COLLAB_URL must use the ws: or wss: protocol.");
	}

	return url.toString();
}

export const collaborationConfig = {
	url: parseCollaborationUrl(import.meta.env.VITE_COLLAB_URL),
};
