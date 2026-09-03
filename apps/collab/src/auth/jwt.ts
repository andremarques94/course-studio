import { createRemoteJWKSet, jwtVerify } from "jose";

export type AuthenticatedConnection = { userId: string };
export type AuthenticateToken = (
	token: string,
) => Promise<AuthenticatedConnection>;

export function createJwtAuthenticator(baseURL: string): AuthenticateToken {
	const jwks = createRemoteJWKSet(new URL(`${baseURL}/api/auth/jwks`));

	return async (token) => {
		const { payload } = await jwtVerify(token, jwks, {
			audience: baseURL,
			issuer: baseURL,
		});
		if (!payload.sub) {
			throw new Error("Authentication token has no subject.");
		}
		return { userId: payload.sub };
	};
}
