import { randomUUID } from "node:crypto";
import {
	type APIRequestContext,
	type BrowserContext,
	expect,
	type Page,
	request,
	test,
} from "@playwright/test";
import { e2eEnvironment } from "./environment";
import {
	authenticate,
	CollaborationProcess,
	getInvitationURL,
	getVerificationURL,
	replaceMarkdown,
	waitForMarkdown,
	waitForStatus,
} from "./helpers";

const collaboration = new CollaborationProcess();

test.beforeAll(async () => {
	await collaboration.start();
});

test.afterAll(async () => {
	await collaboration.stop();
});

test("an owner shares a collaborative course and revokes access", async ({
	browser,
}) => {
	test.slow();
	const apiContexts: APIRequestContext[] = [];
	const browserContexts: BrowserContext[] = [];
	let ownerApi: APIRequestContext | undefined;
	let courseId: string | undefined;

	try {
		const suffix = randomUUID();
		ownerApi = await newApiContext();
		apiContexts.push(ownerApi);
		await authenticate(ownerApi, { name: "Milestone Owner" });

		const editorAccount = {
			email: `milestone-editor-${suffix}@example.com`,
			name: "Milestone Editor",
			password: "playwright-password",
		};

		const ownerContext = await browser.newContext({
			storageState: await ownerApi.storageState(),
		});
		const editorContext = await browser.newContext();
		browserContexts.push(ownerContext, editorContext);
		const ownerLessonPage = await ownerContext.newPage();
		const ownerSharingPage = await ownerContext.newPage();
		const editorPage = await editorContext.newPage();

		const courseTitle = `Shared course ${suffix}`;
		const lessonTitle = `Shared lesson ${suffix}`;

		await ownerLessonPage.goto("/studio/courses");
		await ownerLessonPage.getByLabel("New course").fill(courseTitle);
		await ownerLessonPage.getByRole("button", { name: "Create" }).click();
		await expect(ownerLessonPage).toHaveURL(/\/studio\/courses\/[^/]+$/);
		courseId = pathSegment(ownerLessonPage.url(), -1);

		await ownerLessonPage.getByLabel("New lesson").fill(lessonTitle);
		await ownerLessonPage.getByRole("button", { name: "Create" }).click();
		await expect(ownerLessonPage).toHaveURL(
			/\/studio\/courses\/[^/]+\/lessons\/[^/]+$/,
		);
		const lessonId = pathSegment(ownerLessonPage.url(), -1);
		await waitForStatus(ownerLessonPage, "synced");

		await ownerSharingPage.goto(`/studio/courses/${courseId}`);
		await inviteFromSharingDialog(
			ownerSharingPage,
			courseTitle,
			editorAccount.email,
			"editor",
		);
		const editorInvitationURL = await getInvitationURL(
			ownerSharingPage.request,
			{ courseTitle, email: editorAccount.email },
		);
		await ownerSharingPage.keyboard.press("Escape");

		await editorPage.goto(editorInvitationURL);
		await expect(
			editorPage.getByText("Course invitation", { exact: true }),
		).toBeVisible();
		await editorPage.getByRole("link", { name: "Create account" }).click();
		expect(await editorPage.evaluate(() => location.pathname)).toBe("/sign-up");
		expect(
			await editorPage.evaluate(() =>
				new URLSearchParams(location.search).has("redirect"),
			),
		).toBe(true);
		await editorPage.getByLabel("Full name").fill(editorAccount.name);
		await editorPage.getByLabel("Email").fill(editorAccount.email);
		await editorPage
			.getByLabel("Password", { exact: true })
			.fill(editorAccount.password);
		await editorPage
			.getByLabel("Confirm password")
			.fill(editorAccount.password);
		await editorPage
			.getByRole("button", { name: "Create account", exact: true })
			.click();
		await expect(
			editorPage.getByText(/Check your email to verify/),
		).toBeVisible();
		const verificationURL = await getVerificationURL(
			ownerSharingPage.request,
			editorAccount.email,
		);
		await editorPage.goto(verificationURL);
		await expect(editorPage).toHaveURL(/\/sign-in\?redirect=/);
		await editorPage.getByLabel("Email").fill(editorAccount.email);
		await editorPage
			.getByLabel("Password", { exact: true })
			.fill(editorAccount.password);
		await editorPage
			.getByRole("button", { name: "Sign in", exact: true })
			.click();
		await expect(
			editorPage.getByText("Course invitation", { exact: true }),
		).toBeVisible();
		await editorPage.getByRole("button", { name: "Accept invitation" }).click();
		await expect(
			editorPage.getByRole("heading", { name: courseTitle }),
		).toBeVisible();
		await expect(editorPage.getByText("Editor", { exact: true })).toBeVisible();

		await expect(
			editorPage.getByRole("menuitem", { name: "Share course" }),
		).toHaveCount(0);
		let editorSocketClosed = false;
		editorPage.on("websocket", (socket) => {
			if (socket.url().startsWith(e2eEnvironment.urls.collaboration)) {
				socket.on("close", () => {
					editorSocketClosed = true;
				});
			}
		});
		await editorPage
			.getByRole("link", { name: new RegExp(lessonTitle) })
			.click();
		await waitForStatus(editorPage, "synced");

		const collaborativeMarkdown = `# Edited by Milestone Editor\n\n${suffix}`;
		await replaceMarkdown(editorPage, collaborativeMarkdown);
		await waitForMarkdown(ownerLessonPage, collaborativeMarkdown);
		await waitForStatus(editorPage, "synced");

		await openSharingDialog(ownerSharingPage);
		const sharingDialog = ownerSharingPage.getByRole("dialog", {
			name: `Share ${courseTitle}`,
		});
		await expect(
			sharingDialog.getByText(editorAccount.email, { exact: true }),
		).toBeVisible();
		await sharingDialog
			.getByRole("button", { name: "Remove Milestone Editor" })
			.click();
		await ownerSharingPage
			.getByRole("button", { name: "Remove access" })
			.click();
		await expect(ownerSharingPage.getByText("Member removed")).toBeVisible();
		await expect(
			sharingDialog.getByText(editorAccount.email, { exact: true }),
		).toHaveCount(0);

		expect(
			(
				await editorPage.request.get(
					`${e2eEnvironment.urls.api}/api/courses/${courseId}`,
				)
			).status(),
		).toBe(404);
		expect(
			(
				await editorPage.request.get(
					`${e2eEnvironment.urls.api}/api/lessons/${lessonId}`,
				)
			).status(),
		).toBe(404);

		const ownerMarkdown = `${collaborativeMarkdown}\n\nOwner retained access`;
		await replaceMarkdown(ownerLessonPage, ownerMarkdown);
		await waitForStatus(ownerLessonPage, "synced");
		await expect.poll(() => editorSocketClosed).toBe(true);
		await expect(
			editorPage.getByText("Collaboration access revoked", { exact: true }),
		).toBeVisible();
		await expect(editorPage.getByRole("alert")).toContainText(
			"Your changes can no longer be saved.",
		);
		await expect(editorPage.getByTestId("markdown-editor")).toHaveCount(0);
		await expect(
			editorPage.getByRole("link", { name: "Return to courses" }),
		).toHaveAttribute("href", "/studio/courses");
		await editorPage.reload();
		await expect(
			editorPage.getByText("Course unavailable", { exact: true }),
		).toBeVisible();
		await expect(
			editorPage.getByRole("link", { name: "Return to courses" }),
		).toHaveAttribute("href", "/studio/courses");

		await expect
			.poll(async () => {
				const response = await ownerApi?.get(`/api/lessons/${lessonId}`);
				if (!response?.ok()) {
					return undefined;
				}
				return ((await response.json()) as { markdown: string }).markdown;
			})
			.toBe(ownerMarkdown);

		const viewerApi = await newApiContext();
		apiContexts.push(viewerApi);
		const viewerAccount = await authenticate(viewerApi, {
			name: "Milestone Viewer",
		});
		await inviteFromSharingDialog(
			ownerSharingPage,
			courseTitle,
			viewerAccount.email,
			"viewer",
		);
		const viewerInvitationURL = await getInvitationURL(
			ownerSharingPage.request,
			{ courseTitle, email: viewerAccount.email },
		);

		const viewerContext = await browser.newContext({
			storageState: await viewerApi.storageState(),
		});
		browserContexts.push(viewerContext);
		const viewerPage = await viewerContext.newPage();
		await viewerPage.goto(viewerInvitationURL);
		await viewerPage.getByRole("button", { name: "Accept invitation" }).click();
		await expect(
			viewerPage.getByRole("heading", { name: courseTitle }),
		).toBeVisible();
		await expect(
			viewerPage.getByText("View only", { exact: true }),
		).toBeVisible();
		await expect(viewerPage.getByLabel("New lesson")).toHaveCount(0);
		await expect(
			viewerPage.getByRole("button", { name: "Course actions" }),
		).toHaveCount(0);

		const editableSockets: string[] = [];
		viewerPage.on("websocket", (socket) => {
			if (socket.url().startsWith(e2eEnvironment.urls.collaboration)) {
				editableSockets.push(socket.url());
			}
		});
		await viewerPage
			.getByRole("link", { name: new RegExp(lessonTitle) })
			.click();
		await expect(
			viewerPage.getByRole("main", {
				name: `${lessonTitle} presentation`,
			}),
		).toBeVisible();
		await expect(
			viewerPage.getByRole("heading", { name: "Edited by Milestone Editor" }),
		).toBeVisible();
		await expect(viewerPage.getByTestId("markdown-editor")).toHaveCount(0);
		await expect(viewerPage.locator("output[data-status]")).toHaveCount(0);
		expect(editableSockets).toHaveLength(0);
	} finally {
		await Promise.allSettled(browserContexts.map((context) => context.close()));
		if (ownerApi && courseId) {
			await ownerApi.delete(`/api/courses/${courseId}`);
		}
		await Promise.allSettled(apiContexts.map((context) => context.dispose()));
	}
});

async function newApiContext() {
	return request.newContext({
		baseURL: e2eEnvironment.urls.api,
		extraHTTPHeaders: { origin: e2eEnvironment.urls.web },
	});
}

async function openSharingDialog(page: Page) {
	await page.getByRole("button", { name: "Course actions" }).click();
	await page.getByRole("menuitem", { name: "Share course" }).click();
}

async function inviteFromSharingDialog(
	page: Page,
	courseTitle: string,
	email: string,
	role: "editor" | "viewer",
) {
	const dialog = page.getByRole("dialog", { name: `Share ${courseTitle}` });
	if (!(await dialog.isVisible())) {
		await openSharingDialog(page);
	}
	await dialog.getByLabel("Email address").fill(email);
	if (role === "viewer") {
		await dialog.getByRole("button", { name: "Access", exact: true }).click();
		await page.getByRole("menuitemradio", { name: "Can view" }).click();
	}
	await dialog.getByRole("button", { name: "Invite" }).click();
	await expect(page.getByText("Invitation sent")).toBeVisible();
	await expect(dialog.getByText(email, { exact: true })).toBeVisible();
}

function pathSegment(url: string, index: number) {
	const segment = new URL(url).pathname.split("/").at(index);
	if (!segment) {
		throw new Error("Expected URL path segment");
	}
	return segment;
}
