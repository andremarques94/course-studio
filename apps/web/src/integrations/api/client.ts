import type { AppType } from "@course-studio/api";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { hc } from "hono/client";

const apiURL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const getRequestCookie = createIsomorphicFn()
	.client(() => undefined)
	.server(() => getRequestHeaders().get("cookie") ?? undefined);

const apiFetch: typeof fetch = async (input, init) => {
	const requestURL = new URL(
		typeof input === "string" || input instanceof URL ? input : input.url,
	);
	if (requestURL.origin !== new URL(apiURL).origin) {
		return fetch(input, init);
	}

	const cookie = getRequestCookie();
	if (!cookie) {
		return fetch(input, init);
	}

	const headers = new Headers(init?.headers);
	headers.set("cookie", cookie);
	return fetch(input, { ...init, headers });
};

export const api = hc<AppType>(apiURL, {
	fetch: apiFetch,
	init: { credentials: "include" },
});
