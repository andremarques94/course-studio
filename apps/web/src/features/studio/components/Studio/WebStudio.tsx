import { useQueryClient } from "@tanstack/react-query";
import type { Course } from "@/features/courses/types";
import type { Lesson } from "@/features/lessons/types";
import { createWebStudioCommands } from "../../adapters";
import { useLocalLessonDocument } from "../../document";
import { useStudioDraft } from "../../draft";
import { useDraftNavigationBlocker } from "../../hooks";
import { Studio } from "./Studio";

type WebStudioProps = {
	course: Course;
	lesson: Lesson;
	lessons: Lesson[];
};

export function WebStudio({ course, lesson, lessons }: WebStudioProps) {
	const queryClient = useQueryClient();
	const lessonDocument = useLocalLessonDocument(lesson.markdown);
	const commands = createWebStudioCommands({
		queryClient,
		courseId: course.id,
		lessonId: lesson.id,
	});
	const draft = useStudioDraft({
		lessonId: lesson.id,
		initialDraft: {
			markdown: lesson.markdown,
			themeId: lesson.themeId,
		},
		document: lessonDocument,
		save: commands.updateLesson,
	});
	useDraftNavigationBlocker(draft);

	return (
		<Studio
			course={course}
			lesson={lesson}
			lessons={lessons}
			lessonDocument={lessonDocument}
			draft={draft}
			commands={commands}
		/>
	);
}
