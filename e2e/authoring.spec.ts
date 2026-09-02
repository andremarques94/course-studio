import { randomUUID } from "node:crypto";
import {
	type APIRequestContext,
	expect,
	request,
	test,
} from "@playwright/test";
import { e2eEnvironment } from "./environment";
import {
	CollaborationProcess,
	replaceMarkdown,
	waitForMarkdown,
	waitForStatus,
} from "./helpers";

const collaboration = new CollaborationProcess();
let api: APIRequestContext | undefined;
let courseId: string | undefined;

test.beforeAll(async () => {
	api = await request.newContext({ baseURL: e2eEnvironment.urls.api });
	await collaboration.start();
});

test.afterAll(async () => {
	const cleanupErrors: unknown[] = [];
	try {
		await collaboration.stop();
	} catch (error) {
		cleanupErrors.push(error);
	}

	try {
		if (api && courseId) {
			const response = await api.delete(`/courses/${courseId}`);
			if (!response.ok()) {
				throw new Error(
					`Failed to delete test course ${courseId}: ${response.status()}`,
				);
			}
		}
	} catch (error) {
		cleanupErrors.push(error);
	}

	try {
		await api?.dispose();
	} catch (error) {
		cleanupErrors.push(error);
	}

	if (cleanupErrors.length > 0) {
		throw new AggregateError(cleanupErrors, "Authoring test cleanup failed");
	}
});

test("an author creates a lesson and sees presentation changes", async ({
	page,
}) => {
	const courseTitle = `Playwright course ${randomUUID()}`;
	const lessonTitle = `Lesson ${randomUUID()}`;

	await page.goto("/studio/courses");
	await page.getByLabel("New course").fill(courseTitle);
	await page.getByRole("button", { name: "Create" }).click();
	await expect(page).toHaveURL(/\/studio\/courses\/[^/]+$/);
	courseId = new URL(page.url()).pathname.split("/").at(-1);
	await expect(page.getByRole("heading", { name: courseTitle })).toBeVisible();

	await page.getByLabel("New lesson").fill(lessonTitle);
	await page.getByRole("button", { name: "Create" }).click();
	await expect(page).toHaveURL(/\/studio\/courses\/[^/]+\/lessons\/[^/]+$/);
	await waitForStatus(page, "synced");
	await waitForMarkdown(page, `# ${lessonTitle}`);

	await replaceMarkdown(page, "# First slide\n\n---\n\n## Second slide");
	await expect(page.getByText("2 slides", { exact: true })).toBeVisible();
	const preview = page.getByRole("region", { name: "Preview" });
	await expect(
		preview.getByRole("heading", { name: "First slide" }),
	).toBeVisible();

	await page
		.getByRole("button", { name: "Presentation theme: Minimal" })
		.click();
	await page.getByRole("menuitemradio", { name: "Academic" }).click();
	await expect(
		page.getByRole("button", { name: "Presentation theme: Academic" }),
	).toBeVisible();
	await expect(
		preview.locator('[data-presentation-theme="academic"]'),
	).toBeVisible();
	await waitForStatus(page, "synced");

	await page.reload();
	await waitForStatus(page, "synced");
	await waitForMarkdown(page, "# First slide\n\n---\n\n## Second slide");
	await expect(
		page.getByRole("button", { name: "Presentation theme: Academic" }),
	).toBeVisible();

	const presentButton = page.getByRole("button", {
		name: "Present",
		exact: true,
	});
	await presentButton.click();
	await expect(
		page.getByRole("region", { name: "Presentation" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
});
