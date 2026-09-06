import assert from "node:assert/strict";
import test from "node:test";
import { getInvitationPath, getSafeAuthRedirect } from "./redirect";

const token = "A".repeat(43);
const invitationPath = `/invitations/accept?token=${token}`;

test("accepts studio and exact invitation redirects", () => {
	assert.equal(
		getSafeAuthRedirect("/studio/courses/one"),
		"/studio/courses/one",
	);
	assert.equal(getSafeAuthRedirect(invitationPath), invitationPath);
	assert.equal(getInvitationPath(token), invitationPath);
});

test("rejects external, malformed, and expanded invitation redirects", () => {
	for (const value of [
		"https://example.com/studio",
		"//example.com/studio",
		`/invitations/accept?token=${token}&next=/studio`,
		"/invitations/accept?token=short",
		"/studioevil",
		"/studio/../admin",
		"/studio\\external.example",
		"/studio/courses?next=/admin",
	]) {
		assert.equal(getSafeAuthRedirect(value), "/studio");
	}
	assert.equal(getInvitationPath("not-valid"), undefined);
});
