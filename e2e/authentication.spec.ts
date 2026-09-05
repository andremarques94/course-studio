import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { e2eEnvironment } from "./environment";

test("sign-up, refresh, sign-out, and sign-in work through the UI", async ({
	page,
}) => {
	const email = `playwright-auth-${randomUUID()}@example.com`;
	const password = "playwright-password";

	await page.goto("/sign-up");
	await page.getByLabel("Full name").fill("Playwright Auth User");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByLabel("Confirm password").fill(password);
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page).toHaveURL(/\/studio/);

	await page.reload();
	await expect(page).toHaveURL(/\/studio/);
	await expect(
		page.getByRole("button", { name: "Account menu for Playwright Auth User" }),
	).toBeVisible();

	await page
		.getByRole("button", { name: "Account menu for Playwright Auth User" })
		.click();
	await page.getByRole("menuitem", { name: "Sign out" }).click();
	await expect(page).toHaveURL(/\/sign-in/);
	const privateResponse = await page.request.get(
		`${e2eEnvironment.urls.api}/api/courses`,
	);
	expect(privateResponse.status()).toBe(401);

	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign in", exact: true }).click();
	await expect(page).toHaveURL(/\/studio/);
});
