import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { BuiltinThemeId } from "@course-studio/themes";
import { LessonAutosave, type LessonDraft } from "./index";

const initialDraft: LessonDraft = { markdown: "Initial", themeId: "minimal" };

function createScheduler() {
	let scheduled: (() => void) | undefined;
	return {
		schedule(callback: () => void) {
			scheduled = callback;
			return () => {
				if (scheduled === callback) {
					scheduled = undefined;
				}
			};
		},
		run() {
			const callback = scheduled;
			scheduled = undefined;
			callback?.();
		},
	};
}

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
	const autosave = new LessonAutosave({
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
	const scheduler = createScheduler();
	const calls: LessonDraft[] = [];
	const autosave = new LessonAutosave({
		initialDraft,
		schedule: scheduler.schedule,
		save: async (value) => {
			calls.push(value);
			return value;
		},
	});

	autosave.updateDraft(draft("First"));
	autosave.updateDraft(draft("Latest", "dark"));
	assert.equal(autosave.getSnapshot().status, "unsaved");
	scheduler.run();
	await autosave.flush();

	assert.deepEqual(calls, [draft("Latest", "dark")]);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("coalesces edits during a slow save without overlapping requests", async () => {
	const scheduler = createScheduler();
	const firstSave = deferred<LessonDraft>();
	const secondSave = deferred<LessonDraft>();
	const secondSaveStarted = deferred<void>();
	const calls: LessonDraft[] = [];
	let active = 0;
	let maxActive = 0;
	const autosave = new LessonAutosave({
		initialDraft,
		schedule: scheduler.schedule,
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
	scheduler.run();
	autosave.updateDraft(draft("B"));
	scheduler.run();
	autosave.updateDraft(draft("C"));
	scheduler.run();
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
	const scheduler = createScheduler();
	const firstSave = deferred<LessonDraft>();
	const calls: LessonDraft[] = [];
	const autosave = new LessonAutosave({
		initialDraft,
		schedule: scheduler.schedule,
		save: async (value) => {
			calls.push(value);
			if (calls.length === 1) {
				return firstSave.promise;
			}
			return value;
		},
	});

	autosave.updateDraft(draft("Changed"));
	scheduler.run();
	autosave.updateDraft(initialDraft);
	scheduler.run();
	firstSave.resolve(draft("Changed"));
	await autosave.flush();

	assert.deepEqual(calls, [draft("Changed"), initialDraft]);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("manual save is immediate and does not duplicate queued work", async () => {
	const scheduler = createScheduler();
	const calls: LessonDraft[] = [];
	const autosave = new LessonAutosave({
		initialDraft,
		schedule: scheduler.schedule,
		save: async (value) => {
			calls.push(value);
			return value;
		},
	});

	autosave.updateDraft(draft("Manual"));
	await autosave.saveNow();
	scheduler.run();
	await autosave.flush();

	assert.deepEqual(calls, [draft("Manual")]);
});

test("keeps a failed draft dirty and retries the latest draft", async () => {
	const scheduler = createScheduler();
	const calls: LessonDraft[] = [];
	let shouldFail = true;
	const autosave = new LessonAutosave({
		initialDraft,
		schedule: scheduler.schedule,
		save: async (value) => {
			calls.push(value);
			if (shouldFail) {
				throw new Error("offline");
			}
			return value;
		},
	});

	autosave.updateDraft(draft("Failed"));
	scheduler.run();
	await assert.rejects(autosave.flush(), /offline/);
	assert.equal(autosave.getSnapshot().status, "error");
	assert.equal(autosave.getSnapshot().isUnsafeToLeave, true);

	shouldFail = false;
	autosave.updateDraft(draft("Recovered", "academic"));
	scheduler.run();
	await autosave.flush();

	assert.deepEqual(calls, [draft("Failed"), draft("Recovered", "academic")]);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("continues with a newer queued draft when an older save fails", async () => {
	const scheduler = createScheduler();
	const firstSave = deferred<LessonDraft>();
	const calls: LessonDraft[] = [];
	const autosave = new LessonAutosave({
		initialDraft,
		schedule: scheduler.schedule,
		save: async (value) => {
			calls.push(value);
			if (calls.length === 1) {
				return firstSave.promise;
			}
			return value;
		},
	});

	autosave.updateDraft(draft("Outdated"));
	scheduler.run();
	autosave.updateDraft(draft("Latest"));
	scheduler.run();
	firstSave.reject(new Error("temporary failure"));
	await autosave.flush();

	assert.deepEqual(calls, [draft("Outdated"), draft("Latest")]);
	assert.equal(autosave.getSnapshot().status, "saved");
});

test("does not accept edits or flush after disposal", async () => {
	const calls: LessonDraft[] = [];
	const autosave = new LessonAutosave({
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

test("allows an error listener to retry synchronously", async () => {
	const scheduler = createScheduler();
	const firstSave = deferred<LessonDraft>();
	const calls: LessonDraft[] = [];
	let retry: Promise<void> | undefined;
	const autosave = new LessonAutosave({
		initialDraft,
		schedule: scheduler.schedule,
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
	scheduler.run();
	const failedFlush = autosave.flush();
	firstSave.reject(new Error("offline"));

	await assert.rejects(failedFlush, /offline/);
	assert.ok(retry);
	await retry;
	assert.deepEqual(calls, [draft("Retry"), draft("Retry")]);
	assert.equal(autosave.getSnapshot().status, "saved");
});
