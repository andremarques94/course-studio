import { Badge } from "@course-studio/ui/components/badge";
import type { Course } from "../../../types";
import styles from "../CourseDetailPage.module.css";
import { ShareCourseDialog } from "../ShareCourseDialog";
import { CourseMenu, DeleteCourseDialog, RenameCourseForm } from "./components";
import { useCourseActions } from "./useCourseActions";

export function CourseActions({
	course,
	lessonCount,
}: {
	course: Course;
	lessonCount: number;
}) {
	const actions = useCourseActions(course);

	if (actions.editing) {
		return (
			<RenameCourseForm
				title={actions.title}
				isPending={actions.updateCourse.isPending}
				error={actions.updateCourse.error}
				onTitleChange={(value) => {
					actions.setTitle(value);
					actions.updateCourse.reset();
				}}
				onSubmit={(event) => {
					event.preventDefault();
					actions.updateCourse.mutate();
				}}
				onCancel={actions.cancelEditing}
			/>
		);
	}

	return (
		<>
			<div className={styles.courseTitleRow}>
				<h1>{course.title}</h1>
				{course.accessRole !== "owner" ? (
					<Badge variant="outline" className={styles.accessBadge}>
						{course.accessRole === "editor" ? "Editor" : "View only"}
					</Badge>
				) : null}
				{actions.canEditCourse ? (
					<CourseMenu
						isOwner={actions.isOwner}
						onRename={actions.startEditing}
						onShare={() => actions.setSharing(true)}
						onDelete={actions.confirmDelete}
					/>
				) : null}
				<DeleteCourseDialog
					courseTitle={course.title}
					lessonCount={lessonCount}
					open={actions.confirmingDelete}
					isPending={actions.deleteCourse.isPending}
					error={actions.deleteCourse.error}
					onOpenChange={(open) => {
						actions.setConfirmingDelete(open);
						if (!open) {
							actions.deleteCourse.reset();
						}
					}}
					onConfirm={() => actions.deleteCourse.mutate()}
				/>
			</div>
			{actions.isOwner ? (
				<ShareCourseDialog
					course={course}
					open={actions.sharing}
					onOpenChange={actions.setSharing}
				/>
			) : null}
		</>
	);
}
