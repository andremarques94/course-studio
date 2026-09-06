import { createRemoteJWKSet, jwtVerify, type RemoteJWKSetOptions } from "jose";

export type AuthenticatedConnection = { userId: string };
export type AuthenticateToken = (
	token: string,
) => Promise<AuthenticatedConnection>;

export function createJwtAuthenticator(
	baseURL: string,
	jwksOptions?: RemoteJWKSetOptions,
): AuthenticateToken {
	const jwks = createRemoteJWKSet(
		new URL(`${baseURL}/api/auth/jwks`),
		jwksOptions,
	);

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
