import { strict as assert } from "node:assert";
import { test } from "node:test";
import { exportJWK, generateKeyPair, type JWK, SignJWT } from "jose";
import pino from "pino";
import { createJwtAuthenticator } from "../src/auth/jwt.js";
import { createCollaborationServer } from "../src/server/create-collaboration-server.js";

const baseURL = "http://auth.test";

async function createKey(kid: string) {
	const { privateKey, publicKey } = await generateKeyPair("EdDSA");
	return {
		kid,
		privateKey,
		publicJwk: { ...(await exportJWK(publicKey)), kid },
	};
}

function sign(
	privateKey: CryptoKey,
	kid: string,
	claims: {
		audience?: string;
		expiration?: string;
		issuer?: string;
		subject?: string;
	} = {},
) {
	let token = new SignJWT({})
		.setProtectedHeader({ alg: "EdDSA", kid })
		.setIssuer(claims.issuer ?? baseURL)
		.setAudience(claims.audience ?? baseURL)
		.setExpirationTime(claims.expiration ?? "5m");
	if (claims.subject !== undefined) {
		token = token.setSubject(claims.subject);
	}
	return token.sign(privateKey);
}

function withJwks(
	keys: JWK[],
	run: (fetchCount: () => number) => Promise<void>,
) {
	const originalFetch = globalThis.fetch;
	let requests = 0;
	globalThis.fetch = async () => {
		requests += 1;
		return Response.json({ keys });
	};
	return run(() => requests).finally(() => {
		globalThis.fetch = originalFetch;
	});
}

test("verifies a signed collaboration JWT and returns its subject", async () => {
	const key = await createKey("test");
	await withJwks([key.publicJwk], async () => {
		const token = await sign(key.privateKey, key.kid, { subject: "user-1" });
		assert.deepEqual(await createJwtAuthenticator(baseURL)(token), {
			userId: "user-1",
		});
	});
});

const invalidClaimCases = [
	["expired", { expiration: "-1s", subject: "user-1" }],
	["wrong issuer", { issuer: "http://other.test", subject: "user-1" }],
	["wrong audience", { audience: "http://other.test", subject: "user-1" }],
	["missing subject", {}],
] as const;

for (const [name, claims] of invalidClaimCases) {
	test(`rejects a token with ${name}`, async () => {
		const key = await createKey("test");
		await withJwks([key.publicJwk], async () => {
			await assert.rejects(
				createJwtAuthenticator(baseURL)(
					await sign(key.privateKey, key.kid, claims),
				),
			);
		});
	});
}

test("rejects an invalid signature and malformed token", async () => {
	const trusted = await createKey("test");
	const attacker = await createKey("test");
	await withJwks([trusted.publicJwk], async () => {
		const authenticate = createJwtAuthenticator(baseURL);
		await assert.rejects(
			authenticate(
				await sign(attacker.privateKey, attacker.kid, { subject: "user-1" }),
			),
		);
		await assert.rejects(authenticate("not-a-jwt"));
	});
});

test("caches known JWKS keys", async () => {
	const key = await createKey("known");
	await withJwks([key.publicJwk], async (fetchCount) => {
		const authenticate = createJwtAuthenticator(baseURL);
		await authenticate(
			await sign(key.privateKey, key.kid, { subject: "user-1" }),
		);
		await authenticate(
			await sign(key.privateKey, key.kid, { subject: "user-2" }),
		);
		assert.equal(fetchCount(), 1);
	});
});

test("refreshes JWKS after an unknown kid during key rotation", async () => {
	const first = await createKey("first");
	const rotated = await createKey("rotated");
	const originalFetch = globalThis.fetch;
	let requests = 0;
	globalThis.fetch = async () => {
		requests += 1;
		return Response.json({
			keys: requests === 1 ? [first.publicJwk] : [rotated.publicJwk],
		});
	};

	try {
		const authenticate = createJwtAuthenticator(baseURL, {
			cooldownDuration: 0,
		});
		await authenticate(
			await sign(first.privateKey, first.kid, { subject: "user-1" }),
		);
		await authenticate(
			await sign(rotated.privateKey, rotated.kid, { subject: "user-1" }),
		);
		assert.equal(requests, 2);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("Hocuspocus hook rejects every invalid collaboration token path", async () => {
	const trusted = await createKey("test");
	const attacker = await createKey("test");
	await withJwks([trusted.publicJwk], async () => {
		const server = createCollaborationServer({
			host: "127.0.0.1",
			port: 3002,
			logger: pino({ level: "silent" }),
			authenticateToken: createJwtAuthenticator(baseURL),
			authorizeLesson: async () => true,
			loadDocument: async ({ document }) => document,
			storeDocument: async () => undefined,
		});
		const authenticate = server.hocuspocus.configuration.onAuthenticate;
		assert.ok(authenticate);
		const room = "lesson:550e8400-e29b-41d4-a716-446655440000";
		const invalidTokens = [
			await sign(trusted.privateKey, trusted.kid, {
				expiration: "-1s",
				subject: "user-1",
			}),
			await sign(attacker.privateKey, attacker.kid, { subject: "user-1" }),
			await sign(trusted.privateKey, trusted.kid, {
				issuer: "http://other.test",
				subject: "user-1",
			}),
			await sign(trusted.privateKey, trusted.kid, {
				audience: "http://other.test",
				subject: "user-1",
			}),
			await sign(trusted.privateKey, trusted.kid),
			"not-a-jwt",
		];

		await assert.rejects(
			authenticate({ documentName: room, token: "" } as never),
		);
		for (const token of invalidTokens) {
			await assert.rejects(
				authenticate({ documentName: room, token } as never),
			);
		}
	});
});
