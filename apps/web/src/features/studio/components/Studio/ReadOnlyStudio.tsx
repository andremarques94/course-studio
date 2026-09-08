import { getBuiltinTheme } from "@course-studio/themes";
import { Badge } from "@course-studio/ui/components/badge";
import { buttonVariants } from "@course-studio/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { AppHeader, AppShell, AppSidebar } from "@/components/app-shell";
import type { Course } from "@/features/courses/types";
import type { Lesson, LessonSummary } from "@/features/lessons/types";
import { PresentationPreview } from "../PresentationPreview";
import styles from "./ReadOnlyStudio.module.css";

type ReadOnlyStudioProps = {
	course: Course;
	lesson: Lesson;
	lessons: LessonSummary[];
};

export function ReadOnlyStudio({
	course,
	lesson,
	lessons,
}: ReadOnlyStudioProps) {
	const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
	const previousLesson = lessons[lessonIndex - 1];
	const nextLesson = lessons[lessonIndex + 1];

	return (
		<AppShell
			header={
				<AppHeader>
					<div className={styles.context}>
						<Link
							to="/studio/courses/$courseId"
							params={{ courseId: course.id }}
						>
							{course.title}
						</Link>
						<span aria-hidden="true">/</span>
						<strong>{lesson.title}</strong>
					</div>
					<Badge variant="outline">
						<Eye data-icon="inline-start" />
						View only
					</Badge>
					<nav className={styles.navigation} aria-label="Lesson navigation">
						{previousLesson ? (
							<Link
								className={buttonVariants({
									variant: "ghost",
									size: "icon-sm",
								})}
								to="/studio/courses/$courseId/lessons/$lessonId"
								params={{ courseId: course.id, lessonId: previousLesson.id }}
								aria-label="Previous lesson"
							>
								<ArrowLeft />
							</Link>
						) : null}
						{nextLesson ? (
							<Link
								className={buttonVariants({
									variant: "ghost",
									size: "icon-sm",
								})}
								to="/studio/courses/$courseId/lessons/$lessonId"
								params={{ courseId: course.id, lessonId: nextLesson.id }}
								aria-label="Next lesson"
							>
								<ArrowRight />
							</Link>
						) : null}
					</nav>
				</AppHeader>
			}
			sidebar={<AppSidebar />}
			statusBar={
				<footer className={styles.status}>
					Read-only — viewers can read this lesson but not edit it
				</footer>
			}
		>
			<main
				className={styles.preview}
				aria-label={`${lesson.title} presentation`}
			>
				<PresentationPreview
					markdown={lesson.markdown}
					theme={getBuiltinTheme(lesson.themeId)}
					presentationRef={null}
				/>
			</main>
		</AppShell>
	);
}
