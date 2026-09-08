import { strict as assert } from "node:assert";
import { getEventListeners } from "node:events";
import { test } from "node:test";
import { waitForAuthorization } from "../src/server/wait-for-authorization.js";

test("completed message checks release cancellation listeners", async () => {
	const controller = new AbortController();
	for (let i = 0; i < 1_000; i++) {
		assert.equal(
			await waitForAuthorization(Promise.resolve(true), controller.signal),
			true,
		);
	}
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);
	await assert.rejects(
		waitForAuthorization(
			Promise.reject(new Error("database failure")),
			controller.signal,
		),
		/database failure/,
	);
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("closure rejects all waiting checks and a late success cannot revive them", async () => {
	const controller = new AbortController();
	let resolve!: (value: boolean) => void;
	const check = new Promise<boolean>((done) => {
		resolve = done;
	});
	const waiting = Array.from({ length: 20 }, () =>
		assert.rejects(waitForAuthorization(check, controller.signal), /closed/),
	);
	controller.abort(new Error("closed"));
	await Promise.all(waiting);
	resolve(true);
	await assert.rejects(
		waitForAuthorization(check, controller.signal),
		/closed/,
	);
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});
