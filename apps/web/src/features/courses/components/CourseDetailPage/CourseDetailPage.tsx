import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { courseQueries } from "../../queries";
import { ManagementPage } from "../ManagementPage";
import styles from "./CourseDetailPage.module.css";
import { CreateLessonForm } from "./CreateLessonForm";
import { LessonList } from "./LessonList";

interface CourseDetailPageProps {
	courseId: string;
}

export function CourseDetailPage({ courseId }: CourseDetailPageProps) {
	const { data: course } = useSuspenseQuery(courseQueries.detail(courseId));
	const { data: lessons } = useSuspenseQuery(courseQueries.lessons(courseId));

	if (!course) {
		return (
			<ManagementPage title="Course not found">
				<div className={styles.notFound}>
					<h1>Course not found</h1>
					<Link to="/studio/courses">Return to courses</Link>
				</div>
			</ManagementPage>
		);
	}

	return (
		<ManagementPage title={course.title}>
			<div className={styles.content}>
				<Link to="/studio/courses" className={styles.backLink}>
					<ArrowLeft aria-hidden="true" />
					All courses
				</Link>

				<header className={styles.pageHeader}>
					<div>
						<p className={styles.eyebrow}>Course outline</p>
						<h1>{course.title}</h1>
						<p className={styles.lessonCount}>
							{lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
						</p>
					</div>
					<CreateLessonForm courseId={courseId} />
				</header>

				<LessonList courseId={courseId} lessons={lessons} />
			</div>
		</ManagementPage>
	);
}
