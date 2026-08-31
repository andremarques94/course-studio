import { createFileRoute } from "@tanstack/react-router";
import { CoursesPage } from "@/features/courses/components";
import { courseQueries } from "@/features/courses/queries";

export const Route = createFileRoute("/studio/courses/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(courseQueries.all()),
	head: () => ({ meta: [{ title: "Courses | Course Studio" }] }),
	component: CoursesPage,
});
