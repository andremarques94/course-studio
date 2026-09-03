import { type Database, lessons } from "@course-studio/db";
import { eq } from "drizzle-orm";
import type * as Y from "yjs";
import { z } from "zod";

type LoadLessonDocumentInput = {
	document: Y.Doc;
	documentName: string;
};

type LessonDocumentLoaderOptions = {
	findLesson(lessonId: string): Promise<unknown>;
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
	findLesson,
}: LessonDocumentLoaderOptions) {
	return async function loadLessonDocument({
		document,
		documentName,
	}: LoadLessonDocumentInput) {
		const lessonId = parseLessonDocumentName(documentName);
		const lesson = lessonSchema.optional().parse(await findLesson(lessonId));
		if (!lesson) {
			throw new Error(
				`Could not initialize ${documentName}: lesson not found.`,
			);
		}
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

export function createPostgresLessonFinder(db: Database) {
	return async (lessonId: string) => {
		const [lesson] = await db
			.select({ markdown: lessons.markdown, themeId: lessons.themeId })
			.from(lessons)
			.where(eq(lessons.id, lessonId))
			.limit(1);
		return lesson;
	};
}
