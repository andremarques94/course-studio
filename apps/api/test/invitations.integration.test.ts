import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createAuth } from "@course-studio/auth";
import {
	courseInvitations,
	courseMembers,
	courses,
	createDatabase,
	lessonDocuments,
	user,
} from "@course-studio/db";
import { and, eq, inArray } from "drizzle-orm";
import * as Y from "yjs";
import { createApp } from "#api/app";
import { createLogger } from "#api/logger";
import type { CourseInvitationDelivery } from "#api/modules/invitations/email";
import { hashInvitationToken } from "#api/modules/invitations/token";

const databaseUrl = process.env.DATABASE_URL;
const webOrigin = "http://localhost:3000";
const authSecret =
	process.env.BETTER_AUTH_SECRET ??
	"invitation-integration-secret-32-characters";
const logger = createLogger("silent");

type TestApp = ReturnType<typeof createApp>;
type Account = { app: TestApp; email: string; id: string };
type Delivery = Parameters<CourseInvitationDelivery>[0];
const invitationDeliveries: Delivery[] = [];

test("course invitations enforce delivery, secrecy, lifecycle, and role access", {
	skip: databaseUrl ? false : "DATABASE_URL is not set",
}, async () => {
	if (!databaseUrl) {
		return;
	}

	const db = createDatabase(databaseUrl);
	const verificationLinks = new Map<string, string>();
	invitationDeliveries.length = 0;
	const auth = createAuth(db, {
		baseURL: "http://localhost:3001",
		secret: authSecret,
		trustedOrigins: [webOrigin],
		sendVerificationEmail: async ({ user: verificationUser, url }) => {
			verificationLinks.set(verificationUser.email, url);
		},
	});
	const rootApp = createApp(db, {
		auth,
		corsOrigins: [webOrigin],
		logger,
		webOrigin,
		sendCourseInvitation: async (delivery) => {
			invitationDeliveries.push(delivery);
		},
	});
	const userIds: string[] = [];
	const courseIds: string[] = [];

	try {
		const suffix = randomUUID();
		const owner = await createAccount(
			rootApp,
			verificationLinks,
			`owner-${suffix}@example.com`,
			"Invitation Owner",
		);
		userIds.push(owner.id);
		const editor = await createAccount(
			rootApp,
			verificationLinks,
			`editor-${suffix}@example.com`,
			"Invitation Editor",
		);
		userIds.push(editor.id);
		const viewer = await createAccount(
			rootApp,
			verificationLinks,
			`viewer-${suffix}@example.com`,
			"Invitation Viewer",
		);
		userIds.push(viewer.id);
		const outsider = await createAccount(
			rootApp,
			verificationLinks,
			`outsider-${suffix}@example.com`,
			"Invitation Outsider",
		);
		userIds.push(outsider.id);

		const createCourseResponse = await mutate(owner.app, "/api/courses", {
			method: "POST",
			body: JSON.stringify({ title: `Invitation contract ${suffix}` }),
		});
		assert.equal(createCourseResponse.status, 201);
		const course = (await createCourseResponse.json()) as {
			accessRole: string;
			id: string;
		};
		assert.equal(course.accessRole, "owner");
		courseIds.push(course.id);

		const createLessonResponse = await mutate(
			owner.app,
			`/api/courses/${course.id}/lessons`,
			{
				method: "POST",
				body: JSON.stringify({ title: "Invitation access lesson" }),
			},
		);
		assert.equal(createLessonResponse.status, 201);
		const lesson = (await createLessonResponse.json()) as { id: string };

		for (const path of [
			`/api/courses/${course.id}`,
			`/api/courses/${course.id}/lessons`,
			`/api/lessons/${lesson.id}`,
			`/api/courses/${course.id}/members`,
			`/api/courses/${course.id}/invitations`,
		]) {
			assert.equal((await outsider.app.request(path)).status, 404);
		}

		const deliveriesBeforeUntrustedRequest = invitationDeliveries.length;
		const untrustedResponse = await owner.app.request(
			`/api/courses/${course.id}/invitations`,
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "https://untrusted.example",
				},
				body: JSON.stringify({ email: outsider.email, role: "viewer" }),
			},
		);
		assert.equal(untrustedResponse.status, 403);
		assert.equal(invitationDeliveries.length, deliveriesBeforeUntrustedRequest);

		const normalizedEditorEmail = `  ${editor.email.toUpperCase()}  `;
		const firstCreate = await createInvitation(
			owner.app,
			course.id,
			normalizedEditorEmail,
			"editor",
		);
		assert.equal(firstCreate.response.status, 201);
		assert.equal(firstCreate.body.email, editor.email);
		assertSafeInvitation(firstCreate.body, firstCreate.token);
		assert.equal(firstCreate.delivery.to, editor.email);
		assert.equal(firstCreate.delivery.role, "editor");

		const [storedFirstInvitation] = await db
			.select()
			.from(courseInvitations)
			.where(eq(courseInvitations.id, firstCreate.body.id));
		assert.ok(storedFirstInvitation);
		assert.equal(storedFirstInvitation.email, editor.email);
		assert.equal(
			storedFirstInvitation.tokenHash,
			hashInvitationToken(firstCreate.token),
		);
		assert.notEqual(storedFirstInvitation.tokenHash, firstCreate.token);
		assert.equal(
			JSON.stringify(storedFirstInvitation).includes(firstCreate.token),
			false,
		);

		const pendingResponse = await owner.app.request(
			`/api/courses/${course.id}/invitations`,
		);
		assert.equal(pendingResponse.status, 200);
		const pending = (await pendingResponse.json()) as Array<
			Record<string, unknown>
		>;
		assert.equal(pending.length, 1);
		assertSafeInvitation(pending[0], firstCreate.token);

		const duplicateCreate = await createInvitation(
			owner.app,
			course.id,
			editor.email,
			"editor",
		);
		assert.equal(duplicateCreate.response.status, 201);
		assert.equal(duplicateCreate.body.id, firstCreate.body.id);
		assert.notEqual(duplicateCreate.token, firstCreate.token);
		assertSafeInvitation(duplicateCreate.body, duplicateCreate.token);
		await assertInvalidInvitation(editor.app, firstCreate.token);

		const resendResponse = await mutate(
			owner.app,
			`/api/courses/${course.id}/invitations/${firstCreate.body.id}/resend`,
			{ method: "POST" },
		);
		assert.equal(resendResponse.status, 200);
		const resent = (await resendResponse.json()) as Record<string, unknown>;
		const resendDelivery = invitationDeliveries.at(-1);
		assert.ok(resendDelivery);
		const resendToken = invitationToken(resendDelivery);
		assert.notEqual(resendToken, duplicateCreate.token);
		assertSafeInvitation(resent, resendToken);
		await assertInvalidInvitation(editor.app, duplicateCreate.token);

		await assertInvalidInvitation(viewer.app, resendToken);
		assert.equal(await membershipCount(db, course.id, viewer.id), 0);
		assert.equal(hasCourse(await listCourses(viewer.app), course.id), false);

		const editorAcceptResponse = await acceptInvitation(
			editor.app,
			resendToken,
		);
		assert.equal(editorAcceptResponse.status, 200);
		assert.deepEqual(await editorAcceptResponse.json(), {
			courseId: course.id,
			role: "editor",
		});
		await assertInvalidInvitation(editor.app, resendToken);
		assert.equal(await membershipCount(db, course.id, editor.id), 1);
		assert.equal(
			findCourse(await listCourses(editor.app), course.id)?.accessRole,
			"editor",
		);

		for (const invitee of [owner.email, editor.email]) {
			const response = await mutate(
				owner.app,
				`/api/courses/${course.id}/invitations`,
				{
					method: "POST",
					body: JSON.stringify({ email: invitee, role: "viewer" }),
				},
			);
			assert.equal(response.status, 400);
			assert.equal(await errorCode(response), "INVALID_INVITEE");
		}

		assert.equal(
			(await editor.app.request(`/api/courses/${course.id}`)).status,
			200,
		);
		assert.equal(
			(await editor.app.request(`/api/lessons/${lesson.id}`)).status,
			200,
		);
		const editorUpdate = await mutate(editor.app, `/api/lessons/${lesson.id}`, {
			method: "PATCH",
			body: JSON.stringify({ title: "Edited by course editor" }),
		});
		assert.equal(editorUpdate.status, 200);
		const editorCreateLesson = await mutate(
			editor.app,
			`/api/courses/${course.id}/lessons`,
			{
				method: "POST",
				body: JSON.stringify({ title: "Created by course editor" }),
			},
		);
		assert.equal(editorCreateLesson.status, 201);
		const editorLesson = (await editorCreateLesson.json()) as { id: string };
		assert.equal(
			(
				await mutate(editor.app, `/api/courses/${course.id}/lessons/order`, {
					method: "PUT",
					body: JSON.stringify({ lessonIds: [editorLesson.id, lesson.id] }),
				})
			).status,
			200,
		);
		for (const [path, init] of [
			[`/api/courses/${course.id}/members`, undefined],
			[`/api/courses/${course.id}/invitations`, undefined],
			[`/api/courses/${course.id}`, { method: "DELETE" }],
		] as const) {
			assert.equal((await editor.app.request(path, init)).status, 404);
		}

		const viewerCreate = await createInvitation(
			owner.app,
			course.id,
			viewer.email,
			"viewer",
		);
		assert.equal(viewerCreate.response.status, 201);
		assert.equal(
			(await acceptInvitation(viewer.app, viewerCreate.token)).status,
			200,
		);
		assert.equal(
			findCourse(await listCourses(viewer.app), course.id)?.accessRole,
			"viewer",
		);
		assert.equal(
			(await viewer.app.request(`/api/courses/${course.id}`)).status,
			200,
		);
		const currentDocument = new Y.Doc();
		currentDocument
			.getText("markdown")
			.insert(0, "# Current collaborative draft");
		currentDocument.getMap("metadata").set("themeId", "dark");
		await db.insert(lessonDocuments).values({
			lessonId: lesson.id,
			ydoc: Buffer.from(Y.encodeStateAsUpdate(currentDocument)),
		});
		currentDocument.destroy();
		const viewerLessonResponse = await viewer.app.request(
			`/api/lessons/${lesson.id}`,
		);
		assert.equal(viewerLessonResponse.status, 200);
		const viewerLesson = (await viewerLessonResponse.json()) as {
			markdown: string;
			themeId: string;
		};
		assert.equal(viewerLesson.markdown, "# Current collaborative draft");
		assert.equal(viewerLesson.themeId, "dark");
		for (const [path, init] of [
			[
				`/api/courses/${course.id}`,
				{ method: "PATCH", body: JSON.stringify({ title: "Viewer edit" }) },
			],
			[
				`/api/courses/${course.id}/lessons`,
				{ method: "POST", body: JSON.stringify({ title: "Viewer lesson" }) },
			],
			[
				`/api/lessons/${lesson.id}`,
				{ method: "PATCH", body: JSON.stringify({ title: "Viewer edit" }) },
			],
			[`/api/lessons/${lesson.id}`, { method: "DELETE" }],
			[
				`/api/courses/${course.id}/lessons/order`,
				{
					method: "PUT",
					body: JSON.stringify({ lessonIds: [lesson.id, editorLesson.id] }),
				},
			],
		] as const) {
			assert.equal((await mutate(viewer.app, path, init)).status, 404);
		}

		const revokedCreate = await createInvitation(
			owner.app,
			course.id,
			outsider.email,
			"viewer",
		);
		await db
			.update(user)
			.set({ emailVerified: false })
			.where(eq(user.id, outsider.id));
		await assertInvalidInvitation(outsider.app, revokedCreate.token);
		await db
			.update(user)
			.set({ emailVerified: true })
			.where(eq(user.id, outsider.id));
		const editorRevoke = await mutate(
			editor.app,
			`/api/courses/${course.id}/invitations/${revokedCreate.body.id}`,
			{ method: "DELETE" },
		);
		assert.equal(editorRevoke.status, 404);
		assert.equal(
			(
				await mutate(
					owner.app,
					`/api/courses/${course.id}/invitations/${revokedCreate.body.id}`,
					{ method: "DELETE" },
				)
			).status,
			204,
		);
		await assertInvalidInvitation(outsider.app, revokedCreate.token);
		assert.equal(await membershipCount(db, course.id, outsider.id), 0);

		const expiredCreate = await createInvitation(
			owner.app,
			course.id,
			outsider.email,
			"viewer",
		);
		await db
			.update(courseInvitations)
			.set({ expiresAt: new Date(Date.now() - 60_000) })
			.where(eq(courseInvitations.id, expiredCreate.body.id));
		await assertInvalidInvitation(outsider.app, expiredCreate.token);
		assert.equal(await membershipCount(db, course.id, outsider.id), 0);
		assert.equal(
			(
				await mutate(
					owner.app,
					`/api/courses/${course.id}/invitations/${expiredCreate.body.id}`,
					{ method: "DELETE" },
				)
			).status,
			204,
		);

		const concurrentCreate = await createInvitation(
			owner.app,
			course.id,
			outsider.email,
			"viewer",
		);
		const concurrentResponses = await Promise.all([
			acceptInvitation(outsider.app, concurrentCreate.token),
			acceptInvitation(outsider.app, concurrentCreate.token),
		]);
		assert.deepEqual(
			concurrentResponses.map(({ status }) => status).sort(),
			[200, 400],
		);
		const failedConcurrentResponse = concurrentResponses.find(
			({ status }) => status === 400,
		);
		assert.ok(failedConcurrentResponse);
		assert.equal(
			await errorCode(failedConcurrentResponse),
			"INVALID_INVITATION",
		);
		assert.equal(await membershipCount(db, course.id, outsider.id), 1);

		const membersResponse = await owner.app.request(
			`/api/courses/${course.id}/members`,
		);
		assert.equal(membersResponse.status, 200);
		const members = (await membersResponse.json()) as Array<{
			id: string;
			role: string;
		}>;
		assert.equal(members.find(({ id }) => id === editor.id)?.role, "editor");
		assert.equal(members.find(({ id }) => id === viewer.id)?.role, "viewer");
		assert.equal(
			(
				await mutate(
					editor.app,
					`/api/courses/${course.id}/members/${viewer.id}`,
					{ method: "DELETE" },
				)
			).status,
			404,
		);

		const removeEditorResponse = await mutate(
			owner.app,
			`/api/courses/${course.id}/members/${editor.id}`,
			{ method: "DELETE" },
		);
		assert.equal(removeEditorResponse.status, 204);
		assert.equal(await membershipCount(db, course.id, editor.id), 0);
		assert.equal(
			(await editor.app.request(`/api/courses/${course.id}`)).status,
			404,
		);
		assert.equal(
			(await editor.app.request(`/api/lessons/${lesson.id}`)).status,
			404,
		);
		assert.equal(hasCourse(await listCourses(editor.app), course.id), false);
		for (const [path, init] of [
			[
				`/api/courses/${course.id}`,
				{ method: "PATCH", body: JSON.stringify({ title: "Removed edit" }) },
			],
			[
				`/api/courses/${course.id}/lessons`,
				{ method: "POST", body: JSON.stringify({ title: "Removed lesson" }) },
			],
			[
				`/api/lessons/${lesson.id}`,
				{ method: "PATCH", body: JSON.stringify({ title: "Removed edit" }) },
			],
			[`/api/lessons/${lesson.id}`, { method: "DELETE" }],
			[
				`/api/courses/${course.id}/lessons/order`,
				{
					method: "PUT",
					body: JSON.stringify({ lessonIds: [lesson.id, editorLesson.id] }),
				},
			],
		] as const) {
			assert.equal((await mutate(editor.app, path, init)).status, 404);
		}
	} finally {
		if (courseIds.length > 0) {
			await db.delete(courses).where(inArray(courses.id, courseIds));
		}
		if (userIds.length > 0) {
			await db.delete(user).where(inArray(user.id, userIds));
		}
		await db.$client.end();
	}
});

async function createAccount(
	app: TestApp,
	verificationLinks: Map<string, string>,
	email: string,
	name: string,
): Promise<Account> {
	const credentials = { email, name, password: "test-password" };
	const headers = { "content-type": "application/json", origin: webOrigin };
	const signup = await app.request("/api/auth/sign-up/email", {
		method: "POST",
		headers,
		body: JSON.stringify(credentials),
	});
	assert.equal(signup.status, 200);
	const verificationUrl = verificationLinks.get(email);
	assert.ok(verificationUrl);
	assert.ok((await app.request(verificationUrl)).status < 400);
	const signin = await app.request("/api/auth/sign-in/email", {
		method: "POST",
		headers,
		body: JSON.stringify(credentials),
	});
	assert.equal(signin.status, 200);
	const cookie = signin.headers.get("set-cookie")?.split(";", 1)[0];
	assert.ok(cookie);
	const accountApp = withSession(app, cookie);
	const sessionResponse = await accountApp.request("/api/auth/get-session");
	assert.equal(sessionResponse.status, 200);
	const session = (await sessionResponse.json()) as { user: { id: string } };
	return { app: accountApp, email, id: session.user.id };
}

function withSession(app: TestApp, cookie: string): TestApp {
	return {
		request(input: string | Request, init?: RequestInit) {
			const headers = new Headers(init?.headers);
			headers.set("cookie", cookie);
			return app.request(input, { ...init, headers });
		},
	} as TestApp;
}

function mutate(app: TestApp, path: string, init: RequestInit) {
	const headers = new Headers(init.headers);
	headers.set("origin", webOrigin);
	if (init.body) {
		headers.set("content-type", "application/json");
	}
	return app.request(path, { ...init, headers });
}

async function createInvitation(
	app: TestApp,
	courseId: string,
	email: string,
	role: "editor" | "viewer",
) {
	const response = await mutate(app, `/api/courses/${courseId}/invitations`, {
		method: "POST",
		body: JSON.stringify({ email, role }),
	});
	const body = (await response.json()) as { email: string; id: string };
	const delivery = invitationDeliveries.at(-1);
	assert.ok(delivery);
	return { body, delivery, response, token: invitationToken(delivery) };
}

function invitationToken(delivery: Delivery) {
	const token = new URL(delivery.url).searchParams.get("token");
	assert.ok(token);
	return token;
}

function acceptInvitation(app: TestApp, token: string) {
	return mutate(app, "/api/invitations/accept", {
		method: "POST",
		body: JSON.stringify({ token }),
	});
}

async function assertInvalidInvitation(app: TestApp, token: string) {
	const response = await acceptInvitation(app, token);
	assert.equal(response.status, 400);
	assert.equal(await errorCode(response), "INVALID_INVITATION");
}

async function errorCode(response: Response) {
	return ((await response.json()) as { error: { code: string } }).error.code;
}

function assertSafeInvitation(value: unknown, rawToken: string) {
	const serialized = JSON.stringify(value);
	assert.equal(serialized.includes(rawToken), false);
	assert.equal(/"(?:token|tokenHash)"/.test(serialized), false);
}

async function listCourses(app: TestApp) {
	const response = await app.request("/api/courses");
	assert.equal(response.status, 200);
	return (await response.json()) as Array<{ accessRole: string; id: string }>;
}

function findCourse(
	courseList: Array<{ accessRole: string; id: string }>,
	courseId: string,
) {
	return courseList.find(({ id }) => id === courseId);
}

function hasCourse(
	courseList: Array<{ accessRole: string; id: string }>,
	courseId: string,
) {
	return Boolean(findCourse(courseList, courseId));
}

async function membershipCount(
	db: ReturnType<typeof createDatabase>,
	courseId: string,
	userId: string,
) {
	return (
		await db
			.select({ userId: courseMembers.userId })
			.from(courseMembers)
			.where(
				and(
					eq(courseMembers.courseId, courseId),
					eq(courseMembers.userId, userId),
				),
			)
	).length;
}
