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
import type { AuthSession } from "@/features/auth/auth-client";
import { courseQueries } from "@/features/courses/queries";
import type { Course } from "@/features/courses/types";
import { lessonQueries } from "@/features/lessons/queries";
import { ReadOnlyStudio, WebStudio } from "@/features/studio/components";

export const Route = createFileRoute(
	"/studio/courses/$courseId/lessons/$lessonId",
)({
	loader: async ({ context, params }) => {
		const course = await context.queryClient.query({
			...courseQueries.detail(params.courseId),
			staleTime: "static",
		});
		if (!course) {
			return;
		}

		await Promise.all([
			context.queryClient.query({
				...courseQueries.lessons(params.courseId),
				staleTime: "static",
			}),
			context.queryClient.query({
				...lessonQueries.detail(params.lessonId),
				staleTime: "static",
			}),
		]);
	},
	component: LessonEditorRoute,
});

function LessonEditorRoute() {
	const { courseId, lessonId } = Route.useParams();
	const { user } = Route.useRouteContext();
	const { data: course } = useSuspenseQuery(courseQueries.detail(courseId));

	if (!course) {
		return (
			<main>
				<Empty className="min-h-dvh rounded-none">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<SearchX />
						</EmptyMedia>
						<EmptyTitle>Course unavailable</EmptyTitle>
						<EmptyDescription>
							You may no longer have access to this course.{" "}
							<Link to="/studio/courses">Return to courses</Link>
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</main>
		);
	}

	return (
		<AvailableCourseLessonEditor
			course={course}
			courseId={courseId}
			lessonId={lessonId}
			user={user}
		/>
	);
}

function AvailableCourseLessonEditor({
	course,
	courseId,
	lessonId,
	user,
}: {
	course: Course;
	courseId: string;
	lessonId: string;
	user: AuthSession["user"];
}) {
	const { data: lessons } = useSuspenseQuery(courseQueries.lessons(courseId));
	const { data: lesson } = useSuspenseQuery(lessonQueries.detail(lessonId));

	if (!lesson || lesson.courseId !== course.id) {
		return (
			<main>
				<Empty className="min-h-dvh rounded-none">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<SearchX />
						</EmptyMedia>
						<EmptyTitle>Lesson unavailable</EmptyTitle>
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

	if (course.accessRole === "viewer") {
		return <ReadOnlyStudio course={course} lesson={lesson} lessons={lessons} />;
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
