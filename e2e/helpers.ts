import { type ChildProcess, spawn } from "node:child_process";
import { createConnection } from "node:net";
import { resolve } from "node:path";
import { expect, type Page } from "@playwright/test";
import { e2eEnvironment } from "./environment";

const projectRoot = resolve(__dirname, "..");
const collaborationEntryPoint = resolve(
	projectRoot,
	"apps/collab/dist/index.js",
);

export class CollaborationProcess {
	private child: ChildProcess | null = null;
	private output = "";

	async start() {
		if (this.child) {
			throw new Error("Collaboration server is already running");
		}
		if (await isPortOpen()) {
			throw new Error(
				`Collaboration port ${e2eEnvironment.ports.collaboration} is already in use`,
			);
		}
		this.output = "";

		const child = spawn(
			process.execPath,
			["--env-file-if-exists=.env", collaborationEntryPoint],
			{
				cwd: projectRoot,
				env: {
					...process.env,
					API_URL: e2eEnvironment.urls.api,
					COLLAB_HOST: e2eEnvironment.host,
					COLLAB_PORT: String(e2eEnvironment.ports.collaboration),
					LOG_LEVEL: process.env.CI ? "warn" : "info",
				},
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		this.child = child;
		child.stdout?.on("data", (chunk) => this.captureOutput(chunk));
		child.stderr?.on("data", (chunk) => this.captureOutput(chunk));

		try {
			await waitForPort(true, child);
		} catch (error) {
			await this.stop();
			throw new Error(`Collaboration server failed to start.\n${this.output}`, {
				cause: error,
			});
		}
	}

	async stop() {
		const child = this.child;
		if (!child) {
			return;
		}

		if (child.exitCode === null && child.signalCode === null) {
			child.kill("SIGTERM");
			if (!(await waitForExit(child, 15_000))) {
				child.kill("SIGKILL");
				if (!(await waitForExit(child, 5_000))) {
					throw new Error("Collaboration server did not stop");
				}
			}
		}
		await waitForPort(false);
		this.child = null;
	}

	private captureOutput(chunk: unknown) {
		this.output = `${this.output}${String(chunk)}`.slice(-8_000);
	}
}

export function editor(page: Page) {
	return page
		.getByTestId("markdown-editor")
		.locator('.cm-content[contenteditable="true"]');
}

export async function openLesson(
	page: Page,
	courseId: string,
	lessonId: string,
) {
	await page.goto(`/studio/courses/${courseId}/lessons/${lessonId}`);
	await waitForStatus(page, "synced");
}

export async function readMarkdown(page: Page) {
	return editor(page).evaluate((content) => {
		const textContent = (node: Node): string => {
			if (
				node instanceof Element &&
				node.classList.contains("cm-ySelectionCaret")
			) {
				return "";
			}
			return node.nodeType === Node.TEXT_NODE
				? (node.textContent ?? "")
				: Array.from(node.childNodes, textContent).join("");
		};

		return Array.from(content.querySelectorAll(".cm-line"), textContent).join(
			"\n",
		);
	});
}

export async function replaceMarkdown(page: Page, markdown: string) {
	const target = editor(page);
	await target.click();
	await target.press("ControlOrMeta+A");
	await page.keyboard.insertText(markdown);
}

export async function waitForMarkdown(page: Page, markdown: string) {
	await expect.poll(() => readMarkdown(page)).toBe(markdown);
}

export async function waitForStatus(page: Page, status: string) {
	await expect(page.locator(`output[data-status="${status}"]`)).toBeVisible();
}

async function waitForPort(open: boolean, child?: ChildProcess) {
	const deadline = Date.now() + 15_000;
	while (Date.now() < deadline) {
		if (child && (child.exitCode !== null || child.signalCode !== null)) {
			throw new Error(
				`Collaboration server exited with ${child.exitCode ?? child.signalCode}`,
			);
		}
		if ((await isPortOpen()) === open) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(
		`Timed out waiting for collaboration port to ${open ? "open" : "close"}`,
	);
}

function isPortOpen() {
	return new Promise<boolean>((resolve) => {
		const socket = createConnection({
			host: e2eEnvironment.host,
			port: e2eEnvironment.ports.collaboration,
		});
		const finish = (open: boolean) => {
			socket.destroy();
			resolve(open);
		};
		socket.setTimeout(500, () => finish(false));
		socket.once("connect", () => finish(true));
		socket.once("error", () => finish(false));
	});
}

function waitForExit(child: ChildProcess, timeout: number) {
	if (child.exitCode !== null || child.signalCode !== null) {
		return Promise.resolve(true);
	}

	return new Promise<boolean>((resolve) => {
		const onExit = () => {
			clearTimeout(timer);
			resolve(true);
		};
		const timer = setTimeout(() => {
			child.off("exit", onExit);
			resolve(false);
		}, timeout);
		child.once("exit", onExit);
	});
}
