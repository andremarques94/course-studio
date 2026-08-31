import { createFileRoute } from "@tanstack/react-router";
import { CourseDetailPage } from "@/features/courses/components";
import { courseQueries } from "@/features/courses/queries";

export const Route = createFileRoute("/studio/courses/$courseId/")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				courseQueries.detail(params.courseId),
			),
			context.queryClient.ensureQueryData(
				courseQueries.lessons(params.courseId),
			),
		]),
	component: CourseRoute,
});

function CourseRoute() {
	const { courseId } = Route.useParams();
	return <CourseDetailPage courseId={courseId} />;
}
