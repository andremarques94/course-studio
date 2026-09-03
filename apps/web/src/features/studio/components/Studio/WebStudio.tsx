import { useQueryClient } from "@tanstack/react-query";
import type { AuthSession } from "@/features/auth/auth-client";
import type { Course } from "@/features/courses/types";
import type { Lesson } from "@/features/lessons/types";
import { collaborationConfig } from "@/integrations/collaboration/config";
import { createWebStudioCommands } from "../../adapters";
import {
	type LessonDocument,
	useCollaborativeLessonDocument,
} from "../../document";
import { useStudioDraft } from "../../draft";
import { Studio } from "./Studio";
import { StudioLoadingState } from "./StudioLoadingState";

type WebStudioProps = {
	course: Course;
	lesson: Lesson;
	lessons: Lesson[];
	user: AuthSession["user"];
};

export function WebStudio({ course, lesson, lessons, user }: WebStudioProps) {
	const lessonDocument = useCollaborativeLessonDocument({
		lessonId: lesson.id,
		url: collaborationConfig.url,
		user,
	});

	if (!lessonDocument) {
		return <StudioLoadingState />;
	}

	return (
		<ConnectedWebStudio
			course={course}
			lesson={lesson}
			lessons={lessons}
			lessonDocument={lessonDocument}
		/>
	);
}

function ConnectedWebStudio({
	course,
	lesson,
	lessons,
	lessonDocument,
}: Omit<WebStudioProps, "user"> & { lessonDocument: LessonDocument }) {
	const queryClient = useQueryClient();
	const commands = createWebStudioCommands({
		queryClient,
		courseId: course.id,
		lessonId: lesson.id,
	});
	const draft = useStudioDraft({
		document: lessonDocument,
		fallbackThemeId: lesson.themeId,
	});

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
