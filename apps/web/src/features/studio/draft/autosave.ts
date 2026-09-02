import type { BuiltinThemeId } from "@course-studio/themes";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { funnel } from "remeda";
import type { LessonDocument } from "../document";

export type LessonDraft = {
	markdown: string;
	themeId: BuiltinThemeId;
};

export type AutosaveSnapshot = {
	draft: LessonDraft;
	status: "saved" | "unsaved" | "saving" | "error";
	canSaveNow: boolean;
	isUnsafeToLeave: boolean;
};

type AutosaveState = {
	draft: LessonDraft;
	acknowledged: LessonDraft;
	pendingDraft?: LessonDraft;
	hasError: boolean;
	hasScheduledSave: boolean;
};

type AutosaveRuntime = {
	acknowledged: LessonDraft;
	disposed: boolean;
	draft: LessonDraft;
	hasError: boolean;
	pendingDraft?: LessonDraft;
	saveWorker?: Promise<void>;
	snapshot: AutosaveSnapshot;
};

type CreateAutosaveOptions = {
	initialDraft: LessonDraft;
	save: (draft: LessonDraft) => Promise<LessonDraft>;
	delay?: number;
};

type AutosaveStore = {
	getSnapshot(): AutosaveSnapshot;
	subscribe(listener: () => void): () => void;
	updateDraft(draft: LessonDraft): void;
	resume(): void;
	saveNow(): Promise<void>;
	flush(): Promise<void>;
	dispose(): void;
};

type UseAutosaveOptions = {
	lessonId: string;
	initialDraft: LessonDraft;
	document: LessonDocument;
	save: (draft: LessonDraft) => Promise<LessonDraft>;
};

export type Autosave = AutosaveSnapshot & {
	saveNow(): Promise<void>;
	flush(): Promise<void>;
};

export function createAutosave({
	initialDraft,
	save,
	delay = 1_000,
}: CreateAutosaveOptions): AutosaveStore {
	const listeners = new Set<() => void>();
	const initialDraftCopy = copyDraft(initialDraft);
	const runtime: AutosaveRuntime = {
		acknowledged: initialDraftCopy,
		disposed: false,
		draft: initialDraftCopy,
		hasError: false,
		snapshot: createSnapshot({
			draft: initialDraftCopy,
			acknowledged: initialDraftCopy,
			hasError: false,
			hasScheduledSave: false,
		}),
	};

	const emit = () => {
		runtime.snapshot = createSnapshot({
			draft: runtime.draft,
			acknowledged: runtime.acknowledged,
			pendingDraft: runtime.pendingDraft,
			hasError: runtime.hasError,
			hasScheduledSave: !debouncer.isIdle,
		});
		for (const listener of listeners) {
			listener();
		}
	};

	const assertActive = () => {
		if (runtime.disposed) {
			throw new Error("Cannot flush a disposed lesson autosave.");
		}
	};

	const savePendingDrafts = async () => {
		while (runtime.pendingDraft) {
			const savingDraft = runtime.pendingDraft;
			try {
				runtime.acknowledged = copyDraft(await save(savingDraft));
				runtime.hasError = false;
			} catch (error) {
				runtime.hasError = true;
				if (runtime.pendingDraft !== savingDraft) {
					continue;
				}
				runtime.pendingDraft = undefined;
				throw error;
			}

			if (runtime.pendingDraft === savingDraft) {
				runtime.pendingDraft = undefined;
			}
			emit();
		}
	};

	const runSaveWorker = async () => {
		try {
			await savePendingDrafts();
		} catch (error) {
			runtime.saveWorker = undefined;
			emit();
			throw error;
		}
		runtime.saveWorker = undefined;
	};

	const requestSave = (draft: LessonDraft) => {
		const nextPendingDraft = copyDraft(draft);
		if (
			draftsMatch(
				nextPendingDraft,
				runtime.pendingDraft ?? runtime.acknowledged,
			)
		) {
			return runtime.saveWorker ?? Promise.resolve();
		}

		runtime.pendingDraft = nextPendingDraft;
		emit();
		if (!runtime.saveWorker) {
			runtime.saveWorker = runSaveWorker();
		}
		return runtime.saveWorker;
	};

	const debouncer = funnel(
		() => {
			void requestSave(runtime.draft).catch(() => undefined);
		},
		{ minQuietPeriodMs: delay },
	);

	const flush = async () => {
		assertActive();
		debouncer.cancel();

		while (
			runtime.pendingDraft ||
			!draftsMatch(runtime.draft, runtime.acknowledged)
		) {
			assertActive();
			await requestSave(runtime.draft);
			debouncer.cancel();
		}
	};

	return {
		getSnapshot: () => runtime.snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		updateDraft(draft) {
			if (runtime.disposed || draftsMatch(runtime.draft, draft)) {
				return;
			}

			runtime.draft = copyDraft(draft);
			runtime.hasError = false;
			debouncer.cancel();
			if (
				!draftsMatch(
					runtime.draft,
					runtime.pendingDraft ?? runtime.acknowledged,
				)
			) {
				debouncer.call();
			}
			emit();
		},
		resume() {
			if (!runtime.disposed) {
				return;
			}

			runtime.disposed = false;
			if (
				!draftsMatch(
					runtime.draft,
					runtime.pendingDraft ?? runtime.acknowledged,
				)
			) {
				debouncer.call();
			}
			emit();
		},
		saveNow: flush,
		flush,
		dispose() {
			runtime.disposed = true;
			debouncer.cancel();
		},
	};
}

export function useAutosave({
	lessonId,
	initialDraft,
	document,
	save,
}: UseAutosaveOptions): Autosave {
	const saveLesson = useMutation({
		mutationFn: save,
		scope: { id: `lesson:${lessonId}` },
	});
	const autosaveRef = useRef<AutosaveStore>(null);
	if (!autosaveRef.current) {
		autosaveRef.current = createAutosave({
			initialDraft,
			save: saveLesson.mutateAsync,
		});
	}
	const autosave = autosaveRef.current;
	const snapshot = useSyncExternalStore(
		autosave.subscribe,
		autosave.getSnapshot,
		autosave.getSnapshot,
	);

	useEffect(() => {
		autosave.resume();
		const updateDraft = () => {
			const documentState = document.getSnapshot();
			if (!documentState.ready) {
				return;
			}
			autosave.updateDraft({
				markdown: documentState.markdown,
				themeId: documentState.themeId ?? autosave.getSnapshot().draft.themeId,
			});
		};
		const unsubscribe = document.subscribe(updateDraft);
		updateDraft();
		return () => {
			unsubscribe();
			autosave.dispose();
		};
	}, [autosave, document]);

	return {
		...snapshot,
		saveNow: autosave.saveNow,
		flush: autosave.flush,
	};
}

function draftsMatch(left: LessonDraft, right: LessonDraft) {
	return left.markdown === right.markdown && left.themeId === right.themeId;
}

function copyDraft(draft: LessonDraft): LessonDraft {
	return { markdown: draft.markdown, themeId: draft.themeId };
}

function createSnapshot({
	draft,
	acknowledged,
	pendingDraft,
	hasError,
	hasScheduledSave,
}: AutosaveState): AutosaveSnapshot {
	const isDirty = !draftsMatch(draft, acknowledged);
	const isSaving = Boolean(pendingDraft);
	const canSaveNow =
		(hasError && isDirty) || !draftsMatch(draft, pendingDraft ?? acknowledged);

	const status = getStatus(isSaving, isDirty, hasError);

	return {
		draft: copyDraft(draft),
		status,
		canSaveNow,
		isUnsafeToLeave: isDirty || isSaving || hasScheduledSave,
	};
}

function getStatus(
	isSaving: boolean,
	isDirty: boolean,
	hasError: boolean,
): AutosaveSnapshot["status"] {
	if (isSaving) {
		return "saving";
	}
	if (hasError && isDirty) {
		return "error";
	}
	if (isDirty) {
		return "unsaved";
	}
	return "saved";
}
