import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@course-studio/ui/components/alert-dialog";
import styles from "../../CourseDetailPage.module.css";

export function DeleteCourseDialog({
	courseTitle,
	lessonCount,
	open,
	isPending,
	error,
	onOpenChange,
	onConfirm,
}: {
	courseTitle: string;
	lessonCount: number;
	open: boolean;
	isPending: boolean;
	error?: Error | null;
	onOpenChange(open: boolean): void;
	onConfirm(): void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete "{courseTitle}"?</AlertDialogTitle>
					<AlertDialogDescription>
						This permanently deletes the course and its {lessonCount}{" "}
						{lessonCount === 1 ? "lesson" : "lessons"}. This cannot be undone.
					</AlertDialogDescription>
					{error ? (
						<p className={styles.actionError} role="alert">
							{error.message}
						</p>
					) : null}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel variant="ghost" disabled={isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending ? "Deleting..." : "Delete course"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
