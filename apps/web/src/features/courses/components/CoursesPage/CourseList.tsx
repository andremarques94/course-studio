import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { courseQueries } from "../../queries";
import type { Course } from "../../types";
import styles from "./CoursesPage.module.css";

type CourseListProps = {
	courses: readonly Course[];
};

export function CourseList({ courses }: CourseListProps) {
	if (courses.length === 0) {
		return (
			<Empty className={styles.emptyState}>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<BookOpen />
					</EmptyMedia>
					<EmptyTitle>No courses yet</EmptyTitle>
					<EmptyDescription>
						Create a course to start adding lessons.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className={styles.grid}>
			{courses.map((course, index) => (
				<CourseCard key={course.id} course={course} index={index + 1} />
			))}
		</div>
	);
}

function CourseCard({ course, index }: { course: Course; index: number }) {
	const { data: lessons } = useSuspenseQuery(courseQueries.lessons(course.id));

	return (
		<Link
			to="/studio/courses/$courseId"
			params={{ courseId: course.id }}
			className={styles.card}
		>
			<div className={styles.cardIndex}>{String(index).padStart(2, "0")}</div>
			<div className={styles.cardIcon}>
				<BookOpen aria-hidden="true" />
			</div>
			<div className={styles.cardBody}>
				<h2>{course.title}</h2>
				<p>
					{lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
				</p>
			</div>
			<ArrowRight className={styles.cardArrow} aria-hidden="true" />
		</Link>
	);
}

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@course-studio/ui/components/empty";
