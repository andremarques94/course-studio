import type { BuiltinThemeId } from "@course-studio/themes";

export type LessonDraft = {
	markdown: string;
	themeId: BuiltinThemeId;
};

export type LessonAutosaveSnapshot = {
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

export function draftsMatch(left: LessonDraft, right: LessonDraft) {
	return left.markdown === right.markdown && left.themeId === right.themeId;
}

export function copyDraft(draft: LessonDraft): LessonDraft {
	return { markdown: draft.markdown, themeId: draft.themeId };
}

function getStatus(
	isSaving: boolean,
	isDirty: boolean,
	hasError: boolean,
): LessonAutosaveSnapshot["status"] {
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

export function createAutosaveSnapshot({
	draft,
	acknowledged,
	pendingDraft,
	hasError,
	hasScheduledSave,
}: AutosaveState): LessonAutosaveSnapshot {
	const isDirty = !draftsMatch(draft, acknowledged);
	const isSaving = Boolean(pendingDraft);
	const canSaveNow =
		(hasError && isDirty) || !draftsMatch(draft, pendingDraft ?? acknowledged);

	return {
		draft: copyDraft(draft),
		status: getStatus(isSaving, isDirty, hasError),
		canSaveNow,
		isUnsafeToLeave: isDirty || isSaving || hasScheduledSave,
	};
}
