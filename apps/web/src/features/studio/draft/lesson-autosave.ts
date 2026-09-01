import {
	copyDraft,
	createAutosaveSnapshot,
	draftsMatch,
	type LessonAutosaveSnapshot,
	type LessonDraft,
} from "./lesson-autosave-state";

type CancelScheduledSave = () => void;
type ScheduleSave = (
	callback: () => void,
	delay: number,
) => CancelScheduledSave;

type LessonAutosaveOptions = {
	initialDraft: LessonDraft;
	save: (draft: LessonDraft) => Promise<LessonDraft>;
	delay?: number;
	schedule?: ScheduleSave;
};

const defaultSchedule: ScheduleSave = (callback, delay) => {
	const timeout = setTimeout(callback, delay);
	return () => clearTimeout(timeout);
};

export class LessonAutosave {
	readonly getSnapshot = () => this.snapshot;
	readonly subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	private readonly delay: number;
	private readonly listeners = new Set<() => void>();
	private readonly save: (draft: LessonDraft) => Promise<LessonDraft>;
	private readonly schedule: ScheduleSave;
	private acknowledged: LessonDraft;
	private cancelScheduledSave?: CancelScheduledSave;
	private disposed = false;
	private draft: LessonDraft;
	private hasError = false;
	private pendingDraft?: LessonDraft;
	private saveWorker?: Promise<void>;
	private snapshot: LessonAutosaveSnapshot;

	constructor({
		initialDraft,
		save,
		delay = 1_000,
		schedule = defaultSchedule,
	}: LessonAutosaveOptions) {
		this.draft = copyDraft(initialDraft);
		this.acknowledged = copyDraft(initialDraft);
		this.save = save;
		this.delay = delay;
		this.schedule = schedule;
		this.snapshot = createAutosaveSnapshot({
			draft: this.draft,
			acknowledged: this.acknowledged,
			hasError: false,
			hasScheduledSave: false,
		});
	}

	updateDraft(draft: LessonDraft) {
		if (this.disposed || draftsMatch(this.draft, draft)) {
			return;
		}

		this.draft = copyDraft(draft);
		this.hasError = false;
		this.cancelDebounce();

		if (!draftsMatch(this.draft, this.pendingDraft ?? this.acknowledged)) {
			this.cancelScheduledSave = this.schedule(() => {
				this.cancelScheduledSave = undefined;
				void this.requestSave(this.draft).catch(() => undefined);
			}, this.delay);
		}

		this.emit();
	}

	resume() {
		if (!this.disposed) {
			return;
		}

		this.disposed = false;
		if (!draftsMatch(this.draft, this.pendingDraft ?? this.acknowledged)) {
			this.cancelScheduledSave = this.schedule(() => {
				this.cancelScheduledSave = undefined;
				void this.requestSave(this.draft).catch(() => undefined);
			}, this.delay);
		}
		this.emit();
	}

	saveNow() {
		return this.flush();
	}

	async flush() {
		this.assertActive();
		this.cancelDebounce();

		while (this.pendingDraft || !draftsMatch(this.draft, this.acknowledged)) {
			this.assertActive();
			await this.requestSave(this.draft);
			this.cancelDebounce();
		}
	}

	dispose() {
		this.disposed = true;
		this.cancelDebounce();
	}

	private assertActive() {
		if (this.disposed) {
			throw new Error("Cannot flush a disposed lesson autosave.");
		}
	}

	private cancelDebounce() {
		this.cancelScheduledSave?.();
		this.cancelScheduledSave = undefined;
	}

	private requestSave(draft: LessonDraft) {
		const pendingDraft = copyDraft(draft);
		if (draftsMatch(pendingDraft, this.pendingDraft ?? this.acknowledged)) {
			return this.saveWorker ?? Promise.resolve();
		}

		this.pendingDraft = pendingDraft;
		this.emit();
		if (this.saveWorker) {
			return this.saveWorker;
		}

		this.saveWorker = this.runSaveWorker();
		return this.saveWorker;
	}

	private async runSaveWorker() {
		try {
			await this.savePendingDrafts();
		} catch (error) {
			this.saveWorker = undefined;
			this.emit();
			throw error;
		}
		this.saveWorker = undefined;
	}

	private async savePendingDrafts() {
		while (this.pendingDraft) {
			const savingDraft = this.pendingDraft;
			try {
				this.acknowledged = copyDraft(await this.save(savingDraft));
				this.hasError = false;
			} catch (error) {
				this.hasError = true;
				if (this.pendingDraft !== savingDraft) {
					continue;
				}
				this.pendingDraft = undefined;
				throw error;
			}

			if (this.pendingDraft === savingDraft) {
				this.pendingDraft = undefined;
			}
			this.emit();
		}
	}

	private emit() {
		this.snapshot = createAutosaveSnapshot({
			draft: this.draft,
			acknowledged: this.acknowledged,
			pendingDraft: this.pendingDraft,
			hasError: this.hasError,
			hasScheduledSave: Boolean(this.cancelScheduledSave),
		});
		for (const listener of this.listeners) {
			listener();
		}
	}
}
