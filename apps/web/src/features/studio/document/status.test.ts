import { strict as assert } from "node:assert";
import { test } from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { createCollaborationStatusStore } from "./status";

test("tracks the collaboration lifecycle", () => {
	const status = createCollaborationStatusStore();
	const snapshots = [status.getSnapshot()];
	status.subscribe(() => snapshots.push(status.getSnapshot()));

	status.setTransportStatus("connected");
	status.setUnsyncedChanges(1);
	status.setUnsyncedChanges(0);
	status.setSynced(true);
	status.setTransportStatus("disconnected");
	status.setTransportStatus("connecting");

	assert.deepEqual(snapshots, [
		"connecting",
		"connected",
		"syncing",
		"connected",
		"synced",
		"offline",
		"connecting",
	]);
	status.destroy();
});

test("keeps transport state authoritative over pending changes", () => {
	const status = createCollaborationStatusStore();
	let notifications = 0;
	status.subscribe(() => {
		notifications += 1;
	});

	status.setUnsyncedChanges(2);
	status.setTransportStatus("disconnected");
	status.setUnsyncedChanges(3);

	assert.equal(status.getSnapshot(), "offline");
	assert.equal(notifications, 1);

	status.setTransportStatus("connecting");
	assert.equal(status.getSnapshot(), "connecting");
	status.setTransportStatus("connected");
	assert.equal(status.getSnapshot(), "syncing");
	status.destroy();
});

test("keeps Syncing visible until acknowledged changes remain settled", async () => {
	const status = createCollaborationStatusStore({ syncedSettleDelayMs: 10 });
	status.setTransportStatus("connected");
	status.setSynced(true);
	status.setUnsyncedChanges(1);
	status.setUnsyncedChanges(0);

	assert.equal(status.getSnapshot(), "syncing");
	await wait(5);
	status.setUnsyncedChanges(1);
	await wait(10);
	assert.equal(status.getSnapshot(), "syncing");

	status.setUnsyncedChanges(0);
	await wait(15);
	assert.equal(status.getSnapshot(), "synced");
	status.destroy();
});
