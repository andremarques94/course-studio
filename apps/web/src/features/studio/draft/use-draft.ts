import { type BuiltinThemeId, getBuiltinTheme } from "@course-studio/themes";
import { useDeferredValue, useSyncExternalStore } from "react";
import type { LessonDocument } from "../document";

type UseStudioDraftOptions = {
	document: LessonDocument;
	fallbackThemeId: BuiltinThemeId;
};

export type StudioDraft = {
	markdown: string;
	previewMarkdown: string;
	themeId: BuiltinThemeId;
	theme: ReturnType<typeof getBuiltinTheme>;
	setThemeId(themeId: BuiltinThemeId): void;
};

export function useStudioDraft({
	document,
	fallbackThemeId,
}: UseStudioDraftOptions): StudioDraft {
	const documentState = useSyncExternalStore(
		document.subscribe,
		document.getSnapshot,
		document.getSnapshot,
	);
	const markdown = documentState.markdown;
	const previewMarkdown = useDeferredValue(markdown);
	const themeId = documentState.themeId ?? fallbackThemeId;

	return {
		markdown,
		previewMarkdown,
		themeId,
		theme: getBuiltinTheme(themeId),
		setThemeId(themeId) {
			document.setThemeId(themeId);
		},
	};
}
