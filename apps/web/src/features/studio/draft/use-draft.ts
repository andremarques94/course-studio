import { type BuiltinThemeId, getBuiltinTheme } from "@course-studio/themes";
import { useDeferredValue, useSyncExternalStore } from "react";
import type { LessonDocument } from "../document";
import {
	type AutosaveSnapshot,
	type LessonDraft,
	useAutosave,
} from "./autosave";

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
	saveStatus: AutosaveSnapshot["status"];
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
	const documentState = useSyncExternalStore(
		document.subscribe,
		document.getSnapshot,
		document.getSnapshot,
	);
	const autosave = useAutosave({
		lessonId,
		initialDraft,
		document,
		save,
	});
	const markdown = documentState.markdown;
	const previewMarkdown = useDeferredValue(markdown);
	const themeId = documentState.themeId ?? autosave.draft.themeId;

	return {
		markdown,
		previewMarkdown,
		themeId,
		theme: getBuiltinTheme(themeId),
		saveStatus: autosave.status,
		canSaveNow: autosave.canSaveNow,
		isUnsafeToLeave: autosave.isUnsafeToLeave,
		setThemeId(themeId) {
			document.setThemeId(themeId);
		},
		saveNow: () => autosave.saveNow(),
		flush: () => autosave.flush(),
	};
}
