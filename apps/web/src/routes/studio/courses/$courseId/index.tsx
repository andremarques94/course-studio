import { createFileRoute } from "@tanstack/react-router";
import { CourseDetailPage } from "@/features/courses/components";
import { courseQueries } from "@/features/courses/queries";

export const Route = createFileRoute("/studio/courses/$courseId/")({
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
		]),
	component: CourseRoute,
});

function CourseRoute() {
	const { courseId } = Route.useParams();
	return <CourseDetailPage courseId={courseId} />;
}
