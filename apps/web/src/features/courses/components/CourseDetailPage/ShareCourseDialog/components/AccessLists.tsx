import { Spinner } from "@course-studio/ui/components/spinner";
import type { CourseInvitation, CourseMember } from "../../../../types";
import styles from "../ShareCourseDialog.module.css";
import { InvitationRow, PersonRow } from "./AccessRows";

export function AccessLists({
	members,
	membersPending,
	invitations,
	invitationsPending,
	resendingId,
	queryError,
	onRemoveMember,
	onResend,
	onRevoke,
}: {
	members?: CourseMember[];
	membersPending: boolean;
	invitations?: CourseInvitation[];
	invitationsPending: boolean;
	resendingId?: string;
	queryError: unknown;
	onRemoveMember(member: CourseMember): void;
	onResend(invitationId: string): void;
	onRevoke(invitation: CourseInvitation): void;
}) {
	return (
		<div className={styles.accessList}>
			<section aria-labelledby="members-title">
				<h3 id="members-title">People with access</h3>
				{membersPending ? <Spinner className={styles.loader} /> : null}
				{members?.length === 0 ? (
					<p className={styles.empty}>No collaborators yet.</p>
				) : null}
				{members?.map((member) => (
					<PersonRow
						key={member.id}
						member={member}
						onRemove={() => onRemoveMember(member)}
					/>
				))}
			</section>
			<section aria-labelledby="invitations-title">
				<h3 id="invitations-title">Pending invitations</h3>
				{invitationsPending ? <Spinner className={styles.loader} /> : null}
				{invitations?.length === 0 ? (
					<p className={styles.empty}>No pending invitations.</p>
				) : null}
				{invitations?.map((invitation) => (
					<InvitationRow
						key={invitation.id}
						invitation={invitation}
						resending={resendingId === invitation.id}
						onResend={() => onResend(invitation.id)}
						onRevoke={() => onRevoke(invitation)}
					/>
				))}
			</section>
			{queryError ? (
				<p className={styles.error} role="alert">
					Couldn't load course access. Try again.
				</p>
			) : null}
		</div>
	);
}
