import { useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import type { AuthSession } from "@/features/auth/auth-client";
import type { Course } from "@/features/courses/types";
import type { Lesson } from "@/features/lessons/types";
import { collaborationConfig } from "@/integrations/collaboration/config";
import { createWebStudioCommands } from "../../adapters";
import {
	type LessonDocument,
	useCollaborationStatus,
	useCollaborativeLessonDocument,
	useDraftStorageStatus,
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
	const snapshot = useSyncExternalStore(
		lessonDocument.subscribe,
		lessonDocument.getSnapshot,
		lessonDocument.getSnapshot,
	);
	const collaborationStatus = useCollaborationStatus(
		lessonDocument.collaborationStatus,
	);
	const draftStorageStatus = useDraftStorageStatus(
		lessonDocument.draftStorageStatus,
	);
	useBlocker({
		disabled: draftStorageStatus !== "error",
		enableBeforeUnload: true,
		shouldBlockFn: () =>
			!window.confirm(
				"This draft could not be saved on this device. Leave and risk losing recent edits?",
			),
	});

	if (!snapshot.ready) {
		return collaborationStatus === "auth-failed" ? (
			<StudioConnectionError onRetry={lessonDocument.retryCollaboration} />
		) : (
			<StudioLoadingState />
		);
	}

	return (
		<ReadyWebStudio
			course={course}
			lesson={lesson}
			lessons={lessons}
			lessonDocument={lessonDocument}
		/>
	);
}

function ReadyWebStudio({
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

function StudioConnectionError({ onRetry }: { onRetry: (() => void) | null }) {
	return (
		<main aria-live="assertive">
			<h1>Could not open this lesson</h1>
			<p>Your collaboration session could not be authenticated.</p>
			{onRetry && (
				<button type="button" onClick={onRetry}>
					Retry connection
				</button>
			)}
		</main>
	);
}
