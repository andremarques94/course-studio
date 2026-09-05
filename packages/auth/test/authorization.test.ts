import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
	canEditCourse,
	canEditLesson,
	canPublishCourse,
	canViewCourse,
} from "../src/authorization.js";

const course = { ownerId: "owner" };

test("course owners have every 9A permission", () => {
	assert.equal(canViewCourse("owner", course), true);
	assert.equal(canEditCourse("owner", course), true);
	assert.equal(canPublishCourse("owner", course), true);
	assert.equal(canEditLesson("owner", { course }), true);
});

test("other users have no 9A permissions", () => {
	assert.equal(canViewCourse("other", course), false);
	assert.equal(canEditCourse("other", course), false);
	assert.equal(canPublishCourse("other", course), false);
	assert.equal(canEditLesson("other", { course }), false);
});
