import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { courseQueries } from "@/features/courses/queries";
import { lessonQueries } from "@/features/lessons/queries";
import { Studio } from "@/features/studio/components";

export const Route = createFileRoute(
	"/studio/courses/$courseId/lessons/$lessonId",
)({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				courseQueries.detail(params.courseId),
			),
			context.queryClient.ensureQueryData(
				courseQueries.lessons(params.courseId),
			),
			context.queryClient.ensureQueryData(
				lessonQueries.detail(params.lessonId),
			),
		]),
	component: LessonEditorRoute,
});

function LessonEditorRoute() {
	const { courseId, lessonId } = Route.useParams();
	const { data: course } = useSuspenseQuery(courseQueries.detail(courseId));
	const { data: lessons } = useSuspenseQuery(courseQueries.lessons(courseId));
	const { data: lesson } = useSuspenseQuery(lessonQueries.detail(lessonId));

	if (!course || !lesson || lesson.courseId !== course.id) {
		return (
			<main style={{ padding: "2rem" }}>
				<h1>Lesson not found</h1>
				<Link to="/studio/courses/$courseId" params={{ courseId }}>
					Return to course
				</Link>
			</main>
		);
	}

	return (
		<Studio key={lesson.id} course={course} lesson={lesson} lessons={lessons} />
	);
}
