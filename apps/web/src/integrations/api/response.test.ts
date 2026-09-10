import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { ensureSuccess, readResponse } from "./response";

test("successful responses retain schema transformations and validation", async () => {
	const schema = z.object({ createdAt: z.coerce.date() });
	const result = await readResponse(
		Response.json({ createdAt: "2026-09-10T00:00:00.000Z" }),
		schema,
	);
	assert.equal(result.createdAt.toISOString(), "2026-09-10T00:00:00.000Z");
	await assert.rejects(readResponse(Response.json({}), schema), z.ZodError);
});

test("API errors preserve the server message", async () => {
	await assert.rejects(
		readResponse(
			Response.json(
				{ error: { code: "FORBIDDEN", message: "Access denied." } },
				{ status: 403 },
			),
			z.object({ id: z.string() }),
		),
		{ message: "Access denied." },
	);
});

test("non-JSON and unexpected error bodies use the fallback message", async () => {
	for (const response of [
		new Response("<html>Bad gateway</html>", { status: 502 }),
		Response.json({ message: "Unexpected format" }, { status: 500 }),
	]) {
		await assert.rejects(ensureSuccess(response), {
			message: "The API request failed.",
		});
	}
});

test("204 responses succeed without reading a body", async () => {
	const response = new Response(null, { status: 204 });
	await ensureSuccess(response);
	assert.equal(response.bodyUsed, false);
});
