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

const identity = createEditorIdentity({
	id: "account-142",
	name: "Ada Lovelace",
	image: "https://example.com/ada.jpg",
});

test("creates an editor identity from the authenticated user", () => {
	assert.equal(identity.id, "account-142");
	assert.equal(identity.name, "Ada Lovelace");
	assert.equal(identity.avatarUrl, "https://example.com/ada.jpg");
	assert.deepEqual(parseEditorIdentity(identity), identity);
});

test("omits invalid profile image URLs", () => {
	const generatedIdentity = createEditorIdentity({
		id: "account-143",
		name: "Grace Hopper",
		image: "javascript:alert(1)",
	});

	assert.equal(generatedIdentity.avatarUrl, undefined);
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
	assert.equal(parseEditorIdentity({ ...identity, id: "" }), null);
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
	const remoteClients = Array.from({ length: 6 }, (_, index) => {
		const remoteDocument = new Y.Doc();
		const remoteAwareness = new Awareness(remoteDocument);
		remoteAwareness.setLocalStateField(
			"user",
			createEditorIdentity({
				id: `account-${index}`,
				name: `Collaborator ${index}`,
				image: null,
			}),
		);
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
