import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@course-studio/ui/components/dialog";
import { Separator } from "@course-studio/ui/components/separator";
import type { Course } from "../../../types";
import { AccessLists, InviteForm, RemoveAccessDialog } from "./components";
import styles from "./ShareCourseDialog.module.css";
import { useShareCourse } from "./useShareCourse";

export function ShareCourseDialog({
	course,
	open,
	onOpenChange,
}: {
	course: Course;
	open: boolean;
	onOpenChange(open: boolean): void;
}) {
	const share = useShareCourse(course.id, open);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className={styles.dialog}>
					<DialogHeader>
						<DialogTitle>Share {course.title}</DialogTitle>
						<DialogDescription>
							Invite collaborators and manage who can open this course.
						</DialogDescription>
					</DialogHeader>

					<InviteForm
						email={share.email}
						role={share.role}
						emailError={share.emailError}
						canSubmit={share.parsedInvite.success}
						isPending={share.invite.isPending}
						onEmailChange={share.changeEmail}
						onRoleChange={share.setRole}
						onSubmit={share.submitInvite}
					/>

					<Separator />
					<AccessLists
						members={share.membersQuery.data}
						membersPending={share.membersQuery.isPending}
						invitations={share.invitationsQuery.data}
						invitationsPending={share.invitationsQuery.isPending}
						resendingId={share.resendingId}
						queryError={share.queryError}
						onRemoveMember={(member) =>
							share.setPendingRemoval({ kind: "member", record: member })
						}
						onResend={(invitationId) => share.resend.mutate(invitationId)}
						onRevoke={(invitation) =>
							share.setPendingRemoval({
								kind: "invitation",
								record: invitation,
							})
						}
					/>
				</DialogContent>
			</Dialog>

			<RemoveAccessDialog
				pendingRemoval={share.pendingRemoval}
				isPending={share.remove.isPending}
				error={share.remove.error}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) {
						share.setPendingRemoval(undefined);
					}
				}}
				onConfirm={() => {
					if (share.pendingRemoval) {
						share.remove.mutate(share.pendingRemoval);
					}
				}}
			/>
		</>
	);
}
