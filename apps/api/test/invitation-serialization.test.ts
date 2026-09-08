import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createInvitationSerializer } from "#api/modules/invitations/serialization";

test("serializes operations for the same invitation", async () => {
	const serializer = createInvitationSerializer();
	const firstStarted = deferred<void>();
	const releaseFirst = deferred<void>();
	let active = 0;
	let overlapped = false;

	const run = (started?: Deferred<void>, release?: Promise<void>) =>
		serializer.run("course:person@example.com", async () => {
			active += 1;
			overlapped ||= active > 1;
			started?.resolve();
			await release;
			active -= 1;
		});

	const first = run(firstStarted, releaseFirst.promise);
	await firstStarted.promise;
	const second = run();
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(active, 1);
	assert.equal(overlapped, false);

	releaseFirst.resolve();
	await Promise.all([first, second]);
	assert.equal(overlapped, false);
});

test("bounds active keys, cleans completed keys, and recovers after failure", async () => {
	const serializer = createInvitationSerializer(1);
	const firstStarted = deferred<void>();
	const releaseFirst = deferred<void>();
	let secondStarted = false;

	const first = serializer.run("first", async () => {
		firstStarted.resolve();
		await releaseFirst.promise;
	});
	await firstStarted.promise;
	const second = serializer.run("second", async () => {
		secondStarted = true;
	});
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(secondStarted, false);

	releaseFirst.resolve();
	await Promise.all([first, second]);
	await assert.rejects(
		serializer.run("failed", async () => {
			throw new Error("delivery failed");
		}),
		/delivery failed/,
	);
	await serializer.run("after-failure", async () => undefined);
});

type Deferred<T> = {
	promise: Promise<T>;
	resolve(value: T | PromiseLike<T>): void;
};

function deferred<T>(): Deferred<T> {
	let resolve: Deferred<T>["resolve"] = () => undefined;
	const promise = new Promise<T>((settle) => {
		resolve = settle;
	});
	return { promise, resolve };
}
