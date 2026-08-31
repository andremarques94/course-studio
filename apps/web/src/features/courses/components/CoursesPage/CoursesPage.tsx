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
					<div>
						<p className={styles.eyebrow}>Course library</p>
						<h1>Your courses</h1>
						<p className={styles.intro}>
							Choose a course to manage its lessons, or start a new one.
						</p>
					</div>
					<CreateCourseForm />
				</header>

				<CourseList courses={courses} />
			</div>
		</ManagementPage>
	);
}
