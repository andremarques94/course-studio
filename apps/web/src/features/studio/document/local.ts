import type { BuiltinThemeId } from "@course-studio/themes";
import * as Y from "yjs";
import { createLessonDocumentModel, type ManagedLessonDocument } from "./model";

export function createLocalLessonDocument(
	initialMarkdown: string,
	initialThemeId: BuiltinThemeId,
): ManagedLessonDocument {
	const ydoc = new Y.Doc();
	const markdown = ydoc.getText("markdown");
	const metadata = ydoc.getMap<unknown>("metadata");

	ydoc.transact(() => {
		if (initialMarkdown.length > 0) {
			markdown.insert(0, initialMarkdown);
		}
		metadata.set("themeId", initialThemeId);
	});

	return createLessonDocumentModel(ydoc, true);
}
