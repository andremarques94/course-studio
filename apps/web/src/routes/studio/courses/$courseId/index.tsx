import { createFileRoute } from "@tanstack/react-router";
import {
	CourseDetailPage,
	UnavailableResource,
} from "@/features/courses/components";
import { courseQueries } from "@/features/courses/queries";

export const Route = createFileRoute("/studio/courses/$courseId/")({
	loader: async ({ context, params }) => {
		const course = await context.queryClient.fetchQuery({
			...courseQueries.detail(params.courseId),
			staleTime: 0,
		});
		if (!course) {
			return { available: false } as const;
		}

		try {
			await context.queryClient.fetchQuery({
				...courseQueries.lessons(params.courseId),
				staleTime: 0,
			});
		} catch (error) {
			const currentCourse = await context.queryClient.fetchQuery({
				...courseQueries.detail(params.courseId),
				staleTime: 0,
			});
			if (!currentCourse) {
				return { available: false } as const;
			}
			throw error;
		}

		return { available: true } as const;
	},
	component: CourseRoute,
});

function CourseRoute() {
	const { courseId } = Route.useParams();
	const { available } = Route.useLoaderData();
	if (!available) {
		return <UnavailableResource resource="course" />;
	}
	return <CourseDetailPage courseId={courseId} />;
}
