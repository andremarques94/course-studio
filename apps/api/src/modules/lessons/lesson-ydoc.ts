// Yjs decoding for lesson reads lives here so the lessons service doesn't pay
// the yjs import cost at boot. The collab service owns the Y.Doc format; the
// API only needs the latest markdown + theme for read responses.
import type { lessons } from "@course-studio/db";
import { themeIdSchema } from "@course-studio/validation";

type LessonRow = typeof lessons.$inferSelect;

export async function applyPersistedLessonContent(
	lesson: LessonRow,
	ydoc: Uint8Array,
): Promise<LessonRow> {
	const Y = await import("yjs");
	const document = new Y.Doc();
	try {
		Y.applyUpdate(document, ydoc);
		const themeId = document.getMap<unknown>("metadata").get("themeId");
		const parsedTheme = themeIdSchema.safeParse(themeId);
		return {
			...lesson,
			markdown: document.getText("markdown").toString(),
			themeId: parsedTheme.success ? parsedTheme.data : lesson.themeId,
		};
	} finally {
		document.destroy();
	}
}
