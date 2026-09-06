import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
	type CourseAccess,
	canEditCourse,
	canEditLesson,
	canManageCourseMembers,
	canPublishCourse,
	canViewCourse,
} from "../src/authorization.js";

const accessCases: Array<{
	name: string;
	userId: string;
	course: CourseAccess;
	expected: {
		view: boolean;
		editCourse: boolean;
		editLesson: boolean;
		publish: boolean;
		manageMembers: boolean;
	};
}> = [
	{
		name: "owner",
		userId: "owner",
		course: { ownerId: "owner" },
		expected: {
			view: true,
			editCourse: true,
			editLesson: true,
			publish: true,
			manageMembers: true,
		},
	},
	{
		name: "editor",
		userId: "editor",
		course: { ownerId: "owner", membershipRole: "editor" },
		expected: {
			view: true,
			editCourse: true,
			editLesson: true,
			publish: false,
			manageMembers: false,
		},
	},
	{
		name: "viewer",
		userId: "viewer",
		course: { ownerId: "owner", membershipRole: "viewer" },
		expected: {
			view: true,
			editCourse: false,
			editLesson: false,
			publish: false,
			manageMembers: false,
		},
	},
	{
		name: "outsider",
		userId: "outsider",
		course: { ownerId: "owner", membershipRole: null },
		expected: {
			view: false,
			editCourse: false,
			editLesson: false,
			publish: false,
			manageMembers: false,
		},
	},
];

for (const { name, userId, course, expected } of accessCases) {
	test(`${name} course authorization`, () => {
		assert.deepEqual(
			{
				view: canViewCourse(userId, course),
				editCourse: canEditCourse(userId, course),
				editLesson: canEditLesson(userId, { course }),
				publish: canPublishCourse(userId, course),
				manageMembers: canManageCourseMembers(userId, course),
			},
			expected,
		);
	});
}

test("ownership takes precedence over a membership role", () => {
	const course = { ownerId: "owner", membershipRole: "viewer" } as const;

	assert.equal(canEditCourse("owner", course), true);
	assert.equal(canEditLesson("owner", { course }), true);
	assert.equal(canPublishCourse("owner", course), true);
	assert.equal(canManageCourseMembers("owner", course), true);
});
