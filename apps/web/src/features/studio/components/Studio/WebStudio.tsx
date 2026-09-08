import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@course-studio/ui/components/empty";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { useReducer } from "react";
import type { AuthSession } from "@/features/auth/auth-client";
import type { Course } from "@/features/courses/types";
import type { Lesson, LessonSummary } from "@/features/lessons/types";
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
	lessons: LessonSummary[];
	user: AuthSession["user"];
};

export function WebStudio({ course, lesson, lessons, user }: WebStudioProps) {
	const [accessRevoked, markAccessRevoked] = useReducer(() => true, false);
	const lessonDocument = useCollaborativeLessonDocument({
		lessonId: lesson.id,
		onAccessRevoked: markAccessRevoked,
		url: collaborationConfig.url,
		user,
	});

	if (!lessonDocument) {
		return <StudioLoadingState />;
	}

	if (accessRevoked) {
		return (
			<main>
				<Empty className="min-h-dvh rounded-none" role="alert">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<ShieldX />
						</EmptyMedia>
						<EmptyTitle>Collaboration access revoked</EmptyTitle>
						<EmptyDescription>
							Your changes can no longer be saved.{" "}
							<Link to="/studio/courses">Return to courses</Link>
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</main>
		);
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
