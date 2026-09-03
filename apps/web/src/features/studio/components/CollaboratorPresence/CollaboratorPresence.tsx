import {
	Avatar,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
} from "@course-studio/ui/components/avatar";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@course-studio/ui/components/hover-card";
import type { EditorIdentity } from "../../document";
import styles from "./CollaboratorPresence.module.css";

const MAX_VISIBLE_COLLABORATORS = 4;

type CollaboratorPresenceProps = {
	collaborators: readonly EditorIdentity[];
};

export function CollaboratorPresence({
	collaborators,
}: CollaboratorPresenceProps) {
	const visibleCollaborators = collaborators.slice(
		0,
		MAX_VISIBLE_COLLABORATORS,
	);
	const overflowCount = collaborators.length - visibleCollaborators.length;
	const collaboratorLabel = `${collaborators.length} ${collaborators.length === 1 ? "collaborator" : "collaborators"} present`;

	return (
		<HoverCard>
			<HoverCardTrigger
				className={styles.trigger}
				aria-label={collaboratorLabel}
			>
				<AvatarGroup aria-hidden="true">
					{visibleCollaborators.map((collaborator) => (
						<CollaboratorAvatar
							key={collaborator.id}
							collaborator={collaborator}
						/>
					))}
					{overflowCount > 0 ? (
						<AvatarGroupCount>+{overflowCount}</AvatarGroupCount>
					) : null}
				</AvatarGroup>
			</HoverCardTrigger>
			<HoverCardContent align="end" className={styles.card}>
				<p className={styles.title}>{collaboratorLabel}</p>
				<ul className={styles.list}>
					{collaborators.map((collaborator) => (
						<li key={collaborator.id} className={styles.collaborator}>
							<CollaboratorAvatar collaborator={collaborator} />
							<span>{collaborator.name}</span>
						</li>
					))}
				</ul>
			</HoverCardContent>
		</HoverCard>
	);
}

function CollaboratorAvatar({
	collaborator,
}: {
	collaborator: EditorIdentity;
}) {
	return (
		<Avatar size="sm">
			{collaborator.avatarUrl ? (
				<AvatarImage src={collaborator.avatarUrl} alt="" />
			) : null}
			<AvatarFallback
				style={{ backgroundColor: collaborator.color, color: "white" }}
			>
				{getInitials(collaborator.name)}
			</AvatarFallback>
		</Avatar>
	);
}

function getInitials(name: string): string {
	return name
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}
