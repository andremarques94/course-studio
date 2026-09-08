import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@course-studio/ui/components/avatar";
import { Badge } from "@course-studio/ui/components/badge";
import { Button } from "@course-studio/ui/components/button";
import { Spinner } from "@course-studio/ui/components/spinner";
import { Mail, RefreshCw, Trash2, UserRoundX } from "lucide-react";
import type {
	CourseInvitation,
	CourseMember,
	InvitationRole,
} from "../../../../types";
import styles from "../ShareCourseDialog.module.css";

export function PersonRow({
	member,
	onRemove,
}: {
	member: CourseMember;
	onRemove(): void;
}) {
	return (
		<div className={styles.personRow}>
			<Avatar>
				{member.image ? <AvatarImage src={member.image} alt="" /> : null}
				<AvatarFallback>{initials(member.name)}</AvatarFallback>
			</Avatar>
			<div className={styles.identity}>
				<strong>{member.name}</strong>
				<span>{member.email}</span>
			</div>
			<Badge variant="secondary">{roleLabel(member.role)}</Badge>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`Remove ${member.name}`}
				onClick={onRemove}
			>
				<UserRoundX />
			</Button>
		</div>
	);
}

export function InvitationRow({
	invitation,
	resending,
	onResend,
	onRevoke,
}: {
	invitation: CourseInvitation;
	resending: boolean;
	onResend(): void;
	onRevoke(): void;
}) {
	return (
		<div className={styles.personRow}>
			<Avatar>
				<AvatarFallback>
					<Mail />
				</AvatarFallback>
			</Avatar>
			<div className={styles.identity}>
				<strong>{invitation.email}</strong>
				<span>{formatInvitationExpiry(invitation.expiresAt)}</span>
			</div>
			<Badge variant="outline">{roleLabel(invitation.role)}</Badge>
			<div className={styles.rowActions}>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={`Resend invitation to ${invitation.email}`}
					disabled={resending}
					onClick={onResend}
				>
					{resending ? <Spinner /> : <RefreshCw />}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={`Revoke invitation to ${invitation.email}`}
					onClick={onRevoke}
				>
					<Trash2 />
				</Button>
			</div>
		</div>
	);
}

export function formatInvitationExpiry(expiresAt: Date) {
	const now = new Date();
	if (expiresAt <= now) {
		return `Expired ${expiresAt.toLocaleDateString()}`;
	}
	const time = expiresAt.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
	return `Expires ${expiresAt.toLocaleDateString()} at ${time}`;
}

function initials(name: string) {
	const value = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0] ?? "")
		.join("")
		.toUpperCase();
	return value || "?";
}

function roleLabel(role: InvitationRole) {
	return role === "editor" ? "Editor" : "Viewer";
}
