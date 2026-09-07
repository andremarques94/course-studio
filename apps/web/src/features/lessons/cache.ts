import type { Lesson } from "./types";

export function applyLessonMetadata(
	current: Lesson | null | undefined,
	updated: Lesson,
) {
	return current
		? {
				...updated,
				markdown: current.markdown,
				themeId: current.themeId,
			}
		: updated;
}
