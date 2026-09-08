import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { AuthSession } from "@/features/auth/auth-client";
import { UnavailableResource } from "@/features/courses/components";
import { courseQueries } from "@/features/courses/queries";
import type { Course } from "@/features/courses/types";
import { lessonQueries } from "@/features/lessons/queries";
import type { Lesson } from "@/features/lessons/types";
import { ReadOnlyStudio, WebStudio } from "@/features/studio/components";

export const Route = createFileRoute(
	"/studio/courses/$courseId/lessons/$lessonId",
)({
	loader: async ({ context, params }) => {
		const course = await context.queryClient.fetchQuery({
			...courseQueries.detail(params.courseId),
			staleTime: 0,
		});
		if (!course) {
			return { unavailable: "course" } as const;
		}

		let lesson: Lesson | null = null;
		try {
			[, lesson] = await Promise.all([
				context.queryClient.fetchQuery({
					...courseQueries.lessons(params.courseId),
					staleTime: 0,
				}),
				context.queryClient.fetchQuery({
					...lessonQueries.detail(params.lessonId),
					staleTime: 0,
				}),
			]);
		} catch (error) {
			const currentCourse = await context.queryClient.fetchQuery({
				...courseQueries.detail(params.courseId),
				staleTime: 0,
			});
			if (!currentCourse) {
				return { unavailable: "course" } as const;
			}
			throw error;
		}

		if (!lesson || lesson.courseId !== course.id) {
			const currentCourse = await context.queryClient.fetchQuery({
				...courseQueries.detail(params.courseId),
				staleTime: 0,
			});
			return {
				unavailable: currentCourse ? ("lesson" as const) : ("course" as const),
			};
		}

		return { unavailable: null } as const;
	},
	component: LessonEditorRoute,
});

function LessonEditorRoute() {
	const { courseId, lessonId } = Route.useParams();
	const { user } = Route.useRouteContext();
	const { unavailable } = Route.useLoaderData();

	if (unavailable === "course") {
		return <UnavailableResource resource="course" />;
	}
	if (unavailable === "lesson") {
		return <UnavailableResource resource="lesson" courseId={courseId} />;
	}

	return (
		<AvailableLessonEditor
			courseId={courseId}
			lessonId={lessonId}
			user={user}
		/>
	);
}

function AvailableLessonEditor({
	courseId,
	lessonId,
	user,
}: {
	courseId: string;
	lessonId: string;
	user: AuthSession["user"];
}) {
	const { data: course } = useSuspenseQuery(courseQueries.detail(courseId));
	if (!course) {
		return <UnavailableResource resource="course" />;
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
		return <UnavailableResource resource="lesson" courseId={courseId} />;
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
