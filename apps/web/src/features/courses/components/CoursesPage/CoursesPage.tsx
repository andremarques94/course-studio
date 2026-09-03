import { useSuspenseQuery } from "@tanstack/react-query";
import { courseQueries } from "../../queries";
import { ManagementPage } from "../ManagementPage";
import { CourseList } from "./CourseList";
import styles from "./CoursesPage.module.css";
import { CreateCourseForm } from "./CreateCourseForm";

export function CoursesPage() {
	const { data: courses } = useSuspenseQuery(courseQueries.all());

	return (
		<ManagementPage title="Courses">
			<div className={styles.content}>
				<header className={styles.pageHeader}>
					<div className={styles.headingCopy}>
						<h1>Courses</h1>
						<p className={styles.intro}>
							Build your curriculum one course at a time. Open a course to
							write, preview, and arrange its lessons.
						</p>
					</div>
					<div className={styles.createPanel}>
						<CreateCourseForm />
					</div>
				</header>

				<CourseList courses={courses} />
			</div>
		</ManagementPage>
	);
}
