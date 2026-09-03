import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@course-studio/ui/components/empty";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { courseQueries } from "@/features/courses/queries";
import { lessonQueries } from "@/features/lessons/queries";
import { WebStudio } from "@/features/studio/components";

export const Route = createFileRoute(
	"/studio/courses/$courseId/lessons/$lessonId",
)({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.query({
				...courseQueries.detail(params.courseId),
				staleTime: "static",
			}),
			context.queryClient.query({
				...courseQueries.lessons(params.courseId),
				staleTime: "static",
			}),
			context.queryClient.query({
				...lessonQueries.detail(params.lessonId),
				staleTime: "static",
			}),
		]),
	component: LessonEditorRoute,
});

function LessonEditorRoute() {
	const { courseId, lessonId } = Route.useParams();
	const { user } = Route.useRouteContext();
	const { data: course } = useSuspenseQuery(courseQueries.detail(courseId));
	const { data: lessons } = useSuspenseQuery(courseQueries.lessons(courseId));
	const { data: lesson } = useSuspenseQuery(lessonQueries.detail(lessonId));

	if (!course || !lesson || lesson.courseId !== course.id) {
		return (
			<main>
				<Empty className="min-h-dvh rounded-none">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<SearchX />
						</EmptyMedia>
						<EmptyTitle>Lesson not found</EmptyTitle>
						<EmptyDescription>
							<Link to="/studio/courses/$courseId" params={{ courseId }}>
								Return to course
							</Link>
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</main>
		);
	}

	return (
		<WebStudio
			key={lesson.id}
			course={course}
			lesson={lesson}
			lessons={lessons}
			user={user}
		/>
	);
}
