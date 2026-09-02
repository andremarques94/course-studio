import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
	Awareness,
	applyAwarenessUpdate,
	encodeAwarenessUpdate,
} from "y-protocols/awareness";
import * as Y from "yjs";
import { createEditorIdentity, parseEditorIdentity } from "./identity";
import { createCollaborationPresence } from "./presence";

const identity = {
	id: "019c1f0d-b5b8-7d54-8c18-950eb0f21f7d",
	name: "Guest 0142",
	color: "hsl(202.60deg 72% 48%)",
	colorLight: "hsl(202.60deg 72% 48% / 20%)",
};

test("creates a valid identity without crypto.randomUUID", () => {
	const generatedIdentity = createEditorIdentity();

	assert.match(
		generatedIdentity.id,
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
	);
	assert.deepEqual(parseEditorIdentity(generatedIdentity), generatedIdentity);
});

test("publishes valid Awareness identities", () => {
	const ydoc = new Y.Doc();
	const awareness = new Awareness(ydoc);
	const presence = createCollaborationPresence(awareness);
	let notifications = 0;
	const unsubscribe = presence.subscribe(() => {
		notifications += 1;
	});

	awareness.setLocalStateField("user", identity);

	assert.deepEqual(presence.getSnapshot(), [identity]);
	assert.equal(notifications, 1);

	unsubscribe();
	presence.destroy();
	awareness.destroy();
	ydoc.destroy();
});

test("ignores malformed or untrusted Awareness identities", () => {
	const ydoc = new Y.Doc();
	const awareness = new Awareness(ydoc);
	const presence = createCollaborationPresence(awareness);

	awareness.setLocalStateField("user", {
		...identity,
		name: "<script>alert(1)</script>",
		color: "url(javascript:alert(1))",
	});

	assert.deepEqual(presence.getSnapshot(), []);
	assert.deepEqual(parseEditorIdentity(identity), identity);
	assert.equal(parseEditorIdentity({ ...identity, id: "not-an-id" }), null);
	assert.equal(
		parseEditorIdentity({
			...identity,
			colorLight: "url(javascript:alert(1))",
		}),
		null,
	);

	presence.destroy();
	awareness.destroy();
	ydoc.destroy();
});

test("tracks more than five collaborators", () => {
	const ydoc = new Y.Doc();
	const awareness = new Awareness(ydoc);
	const presence = createCollaborationPresence(awareness);
	const remoteClients = Array.from({ length: 6 }, () => {
		const remoteDocument = new Y.Doc();
		const remoteAwareness = new Awareness(remoteDocument);
		remoteAwareness.setLocalStateField("user", createEditorIdentity());
		applyAwarenessUpdate(
			awareness,
			encodeAwarenessUpdate(remoteAwareness, [remoteDocument.clientID]),
			"test",
		);
		return { remoteAwareness, remoteDocument };
	});

	assert.equal(presence.getSnapshot().length, 6);

	for (const { remoteAwareness, remoteDocument } of remoteClients) {
		remoteAwareness.destroy();
		remoteDocument.destroy();
	}
	presence.destroy();
	awareness.destroy();
	ydoc.destroy();
});
