import type * as Y from "yjs";
import { z } from "zod";

type Fetch = typeof globalThis.fetch;

type LoadLessonDocumentInput = {
	document: Y.Doc;
	documentName: string;
};

type LessonDocumentLoaderOptions = {
	apiUrl: string;
	fetch?: Fetch;
};

const lessonRoomSchema = z
	.string()
	.regex(
		/^lesson:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	)
	.transform((room) => room.slice("lesson:".length));
const lessonSchema = z.object({
	markdown: z.string(),
	themeId: z.enum(["minimal", "academic", "dark"]),
});

export function parseLessonDocumentName(documentName: string) {
	return lessonRoomSchema.parse(documentName);
}

export function createLessonDocumentLoader({
	apiUrl,
	fetch: fetchLesson = globalThis.fetch,
}: LessonDocumentLoaderOptions) {
	return async function loadLessonDocument({
		document,
		documentName,
	}: LoadLessonDocumentInput) {
		const lessonId = parseLessonDocumentName(documentName);
		const response = await fetchLesson(
			`${apiUrl}/lessons/${encodeURIComponent(lessonId)}`,
			{ signal: AbortSignal.timeout(5_000) },
		);

		if (!response.ok) {
			throw new Error(
				`Could not initialize ${documentName}: lesson API returned ${response.status}.`,
			);
		}

		const lesson = lessonSchema.parse(await response.json());
		const markdown = document.getText("markdown");
		const metadata = document.getMap<unknown>("metadata");
		if (markdown.length === 0 && lesson.markdown.length > 0) {
			markdown.insert(0, lesson.markdown);
		}
		if (!metadata.has("themeId")) {
			metadata.set("themeId", lesson.themeId);
		}
	};
}
