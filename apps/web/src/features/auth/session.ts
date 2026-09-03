import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import type { AuthSession } from "./auth-client";

const apiURL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const studioRedirectSchema = z
	.union([z.literal("/studio"), z.string().startsWith("/studio/")])
	.catch("/studio");

const authSessionSchema: z.ZodType<AuthSession> = z.object({
	user: z.object({
		id: z.string(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
		email: z.email(),
		emailVerified: z.boolean(),
		name: z.string(),
		image: z.string().nullable().optional(),
	}),
	session: z.object({
		id: z.string(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
		userId: z.string(),
		expiresAt: z.coerce.date(),
		token: z.string(),
		ipAddress: z.string().nullable().optional(),
		userAgent: z.string().nullable().optional(),
	}),
});

export const getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const requestHeaders = getRequestHeaders();
		const cookie = requestHeaders.get("cookie");
		const response = await fetch(`${apiURL}/api/auth/get-session`, {
			headers: cookie ? { cookie } : undefined,
		});

		if (!response.ok) {
			return null;
		}

		const body: unknown = await response.json();
		return body === null ? null : authSessionSchema.parse(body);
	},
);

export function getSafeStudioRedirect(value: unknown) {
	return studioRedirectSchema.parse(value);
}
