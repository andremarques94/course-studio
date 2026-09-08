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
import { Spinner } from "@course-studio/ui/components/spinner";
import styles from "../ShareCourseDialog.module.css";
import type { PendingRemoval } from "../useShareCourse";

export function RemoveAccessDialog({
	pendingRemoval,
	isPending,
	error,
	onOpenChange,
	onConfirm,
}: {
	pendingRemoval?: PendingRemoval;
	isPending: boolean;
	error?: Error | null;
	onOpenChange(open: boolean): void;
	onConfirm(): void;
}) {
	return (
		<AlertDialog
			open={Boolean(pendingRemoval)}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !isPending) {
					onOpenChange(false);
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{pendingRemoval?.kind === "member"
							? "Remove course access?"
							: "Revoke invitation?"}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{pendingRemoval?.kind === "member"
							? `${pendingRemoval.record.name} will no longer be able to open this course.`
							: `The invitation for ${pendingRemoval?.record.email ?? "this person"} will stop working.`}
					</AlertDialogDescription>
					{error ? (
						<p className={styles.error} role="alert">
							{error.message}
						</p>
					) : null}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={isPending}
						onClick={onConfirm}
					>
						{isPending ? <Spinner data-icon="inline-start" /> : null}
						{pendingRemoval?.kind === "member"
							? "Remove access"
							: "Revoke invitation"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
