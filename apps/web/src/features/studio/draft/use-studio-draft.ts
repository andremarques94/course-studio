import { type BuiltinThemeId, getBuiltinTheme } from "@course-studio/themes";
import { useMutation } from "@tanstack/react-query";
import {
	useDeferredValue,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";
import type { LessonDocument } from "../document";
import { LessonAutosave } from "./lesson-autosave";
import type {
	LessonAutosaveSnapshot,
	LessonDraft,
} from "./lesson-autosave-state";

type UseStudioDraftOptions = {
	lessonId: string;
	initialDraft: LessonDraft;
	document: LessonDocument;
	save: (draft: LessonDraft) => Promise<LessonDraft>;
};

export type StudioDraft = {
	markdown: string;
	previewMarkdown: string;
	themeId: BuiltinThemeId;
	theme: ReturnType<typeof getBuiltinTheme>;
	saveStatus: LessonAutosaveSnapshot["status"];
	canSaveNow: boolean;
	isUnsafeToLeave: boolean;
	setThemeId(themeId: BuiltinThemeId): void;
	saveNow(): Promise<void>;
	flush(): Promise<void>;
};

export function useStudioDraft({
	lessonId,
	initialDraft,
	document,
	save,
}: UseStudioDraftOptions): StudioDraft {
	const saveLesson = useMutation({
		mutationFn: save,
		scope: { id: `lesson:${lessonId}` },
	});
	const [autosave] = useState(
		() =>
			new LessonAutosave({
				initialDraft,
				save: saveLesson.mutateAsync,
			}),
	);
	const autosaveState = useSyncExternalStore(
		autosave.subscribe,
		autosave.getSnapshot,
		autosave.getSnapshot,
	);
	const markdown = useSyncExternalStore(
		document.subscribeToMarkdown,
		document.getMarkdownSnapshot,
		document.getMarkdownSnapshot,
	);
	const previewMarkdown = useDeferredValue(markdown);

	useEffect(
		() =>
			document.subscribeToMarkdown(() => {
				autosave.updateDraft({
					...autosave.getSnapshot().draft,
					markdown: document.getMarkdownSnapshot(),
				});
			}),
		[autosave, document],
	);
	useEffect(() => () => autosave.dispose(), [autosave]);

	return {
		markdown,
		previewMarkdown,
		themeId: autosaveState.draft.themeId,
		theme: getBuiltinTheme(autosaveState.draft.themeId),
		saveStatus: autosaveState.status,
		canSaveNow: autosaveState.canSaveNow,
		isUnsafeToLeave: autosaveState.isUnsafeToLeave,
		setThemeId(themeId) {
			autosave.updateDraft({ ...autosave.getSnapshot().draft, themeId });
		},
		saveNow: () => autosave.saveNow(),
		flush: () => autosave.flush(),
	};
}
