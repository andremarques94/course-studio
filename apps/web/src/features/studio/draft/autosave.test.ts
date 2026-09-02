import { strict as assert } from "node:assert";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import type { BuiltinThemeId } from "@course-studio/themes";
import { createAutosave, type LessonDraft } from "./autosave";

const initialDraft: LessonDraft = { markdown: "Initial", themeId: "minimal" };

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

function draft(markdown: string, themeId: BuiltinThemeId = "minimal") {
	return { markdown, themeId };
}

test("starts saved without sending the initial draft", () => {
	const calls: LessonDraft[] = [];
	const autosave = createAutosave({
		initialDraft,
		save: async (value) => {
			calls.push(value);
			return value;
		},
	});

	assert.equal(autosave.getSnapshot().status, "saved");
	assert.equal(autosave.getSnapshot().isUnsafeToLeave, false);
	assert.deepEqual(calls, []);
});

test("debounces edits into one latest save", async () => {
	const calls: LessonDraft[] = [];
	const autosave = createAutosave({
		initialDraft,
		delay: 1,
		save: async (value) => {
			calls.push(value);
			return value;
		},
	});

	autosave.updateDraft(draft("First"));
	autosave.updateDraft(draft("Latest", "dark"));
	assert.equal(autosave.getSnapshot().status, "unsaved");
	await sleep(1);
	await autosave.flush();

	assert.deepEqual(calls, [draft("Latest", "dark")]);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("coalesces edits during a slow save without overlapping requests", async () => {
	const firstSave = deferred<LessonDraft>();
	const secondSave = deferred<LessonDraft>();
	const secondSaveStarted = deferred<void>();
	const calls: LessonDraft[] = [];
	let active = 0;
	let maxActive = 0;
	const autosave = createAutosave({
		initialDraft,
		delay: 1,
		save: async (value) => {
			calls.push(value);
			active += 1;
			maxActive = Math.max(maxActive, active);
			const save = calls.length === 1 ? firstSave.promise : secondSave.promise;
			if (calls.length === 2) {
				secondSaveStarted.resolve();
			}
			const result = await save;
			active -= 1;
			return result;
		},
	});

	autosave.updateDraft(draft("A"));
	await sleep(1);
	autosave.updateDraft(draft("B"));
	await sleep(1);
	autosave.updateDraft(draft("C"));
	await sleep(1);
	assert.deepEqual(calls, [draft("A")]);

	firstSave.resolve(draft("A"));
	await secondSaveStarted.promise;
	assert.deepEqual(calls, [draft("A"), draft("C")]);
	secondSave.resolve(draft("C"));
	await autosave.flush();

	assert.equal(maxActive, 1);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("persists a reversion made while another draft is saving", async () => {
	const firstSave = deferred<LessonDraft>();
	const calls: LessonDraft[] = [];
	const autosave = createAutosave({
		initialDraft,
		delay: 1,
		save: async (value) => {
			calls.push(value);
			if (calls.length === 1) {
				return firstSave.promise;
			}
			return value;
		},
	});

	autosave.updateDraft(draft("Changed"));
	await sleep(1);
	autosave.updateDraft(initialDraft);
	await sleep(1);
	firstSave.resolve(draft("Changed"));
	await autosave.flush();

	assert.deepEqual(calls, [draft("Changed"), initialDraft]);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("manual save is immediate and does not duplicate queued work", async () => {
	const calls: LessonDraft[] = [];
	const autosave = createAutosave({
		initialDraft,
		delay: 1,
		save: async (value) => {
			calls.push(value);
			return value;
		},
	});

	autosave.updateDraft(draft("Manual"));
	await autosave.saveNow();
	await sleep(1);
	await autosave.flush();

	assert.deepEqual(calls, [draft("Manual")]);
});

test("keeps a failed draft dirty and retries the latest draft", async () => {
	const calls: LessonDraft[] = [];
	let shouldFail = true;
	const autosave = createAutosave({
		initialDraft,
		delay: 1,
		save: async (value) => {
			calls.push(value);
			if (shouldFail) {
				throw new Error("offline");
			}
			return value;
		},
	});

	autosave.updateDraft(draft("Failed"));
	await assert.rejects(autosave.flush(), /offline/);
	assert.equal(autosave.getSnapshot().status, "error");
	assert.equal(autosave.getSnapshot().isUnsafeToLeave, true);

	shouldFail = false;
	autosave.updateDraft(draft("Recovered", "academic"));
	await sleep(1);
	await autosave.flush();

	assert.deepEqual(calls, [draft("Failed"), draft("Recovered", "academic")]);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("continues with a newer queued draft when an older save fails", async () => {
	const firstSave = deferred<LessonDraft>();
	const calls: LessonDraft[] = [];
	const autosave = createAutosave({
		initialDraft,
		delay: 1,
		save: async (value) => {
			calls.push(value);
			if (calls.length === 1) {
				return firstSave.promise;
			}
			return value;
		},
	});

	autosave.updateDraft(draft("Outdated"));
	await sleep(1);
	autosave.updateDraft(draft("Latest"));
	await sleep(1);
	firstSave.reject(new Error("temporary failure"));
	await autosave.flush();

	assert.deepEqual(calls, [draft("Outdated"), draft("Latest")]);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("does not accept edits or flush after disposal", async () => {
	const calls: LessonDraft[] = [];
	const autosave = createAutosave({
		initialDraft,
		save: async (value) => {
			calls.push(value);
			return value;
		},
	});

	autosave.dispose();
	autosave.updateDraft(draft("Ignored"));

	await assert.rejects(autosave.flush(), /disposed lesson autosave/);
	assert.deepEqual(calls, []);
	assert.deepEqual(autosave.getSnapshot().draft, initialDraft);
});

test("resumes after a development Strict Mode effect cleanup", async () => {
	const saves: LessonDraft[] = [];
	const autosave = createAutosave({
		initialDraft,
		save: async (nextDraft) => {
			saves.push(nextDraft);
			return nextDraft;
		},
	});

	autosave.dispose();
	autosave.resume();
	autosave.updateDraft(draft("Strict Mode edit", "dark"));

	assert.equal(autosave.getSnapshot().status, "unsaved");
	await autosave.saveNow();
	assert.deepEqual(saves, [draft("Strict Mode edit", "dark")]);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("allows an error listener to retry synchronously", async () => {
	const firstSave = deferred<LessonDraft>();
	const calls: LessonDraft[] = [];
	let retry: Promise<void> | undefined;
	const autosave = createAutosave({
		initialDraft,
		delay: 1,
		save: async (value) => {
			calls.push(value);
			if (calls.length === 1) {
				return firstSave.promise;
			}
			return value;
		},
	});
	autosave.subscribe(() => {
		if (autosave.getSnapshot().status === "error" && !retry) {
			retry = autosave.flush();
		}
	});

	autosave.updateDraft(draft("Retry"));
	await sleep(1);
	const failedFlush = autosave.flush();
	firstSave.reject(new Error("offline"));

	await assert.rejects(failedFlush, /offline/);
	assert.ok(retry);
	await retry;
	assert.deepEqual(calls, [draft("Retry"), draft("Retry")]);
	assert.equal(autosave.getSnapshot().status, "saved");
});
