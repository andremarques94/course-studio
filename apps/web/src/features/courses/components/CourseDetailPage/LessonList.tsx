import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";
import type { Lesson } from "@/features/lessons/types";
import styles from "./CourseDetailPage.module.css";

interface LessonListProps {
	courseId: string;
	lessons: readonly Lesson[];
}

export function LessonList({ courseId, lessons }: LessonListProps) {
	return (
		<>
			<ol className={styles.lessonList}>
				{lessons.map((lesson, index) => (
					<li key={lesson.id}>
						<Link
							to="/studio/courses/$courseId/lessons/$lessonId"
							params={{ courseId, lessonId: lesson.id }}
							className={styles.lessonLink}
						>
							<span className={styles.position}>
								{String(index + 1).padStart(2, "0")}
							</span>
							<span className={styles.lessonIcon}>
								<FileText aria-hidden="true" />
							</span>
							<span className={styles.lessonTitle}>{lesson.title}</span>
							<span className={styles.openLabel}>Open editor</span>
							<ArrowRight className={styles.arrow} aria-hidden="true" />
						</Link>
					</li>
				))}
			</ol>
			{lessons.length === 0 ? (
				<p className={styles.empty}>
					Create the first lesson to open the editor.
				</p>
			) : null}
		</>
	);
}
