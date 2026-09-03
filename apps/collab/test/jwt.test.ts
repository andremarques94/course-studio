import { strict as assert } from "node:assert";
import { test } from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { createJwtAuthenticator } from "../src/auth/jwt.js";

const baseURL = "http://auth.test";

test("verifies a signed collaboration JWT and returns its subject", async () => {
	const { privateKey, publicKey } = await generateKeyPair("EdDSA");
	const publicJwk = await exportJWK(publicKey);
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () =>
		Response.json({ keys: [{ ...publicJwk, kid: "test" }] });

	try {
		const token = await new SignJWT({})
			.setProtectedHeader({ alg: "EdDSA", kid: "test" })
			.setIssuer(baseURL)
			.setAudience(baseURL)
			.setSubject("user-1")
			.setExpirationTime("5m")
			.sign(privateKey);

		assert.deepEqual(await createJwtAuthenticator(baseURL)(token), {
			userId: "user-1",
		});
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("rejects tokens with the wrong audience", async () => {
	const { privateKey, publicKey } = await generateKeyPair("EdDSA");
	const publicJwk = await exportJWK(publicKey);
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () =>
		Response.json({ keys: [{ ...publicJwk, kid: "test" }] });

	try {
		const token = await new SignJWT({})
			.setProtectedHeader({ alg: "EdDSA", kid: "test" })
			.setIssuer(baseURL)
			.setAudience("http://other.test")
			.setSubject("user-1")
			.setExpirationTime("5m")
			.sign(privateKey);
		await assert.rejects(createJwtAuthenticator(baseURL)(token));
	} finally {
		globalThis.fetch = originalFetch;
	}
});
