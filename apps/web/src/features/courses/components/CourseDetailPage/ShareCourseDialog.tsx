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
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@course-studio/ui/components/avatar";
import { Badge } from "@course-studio/ui/components/badge";
import { Button } from "@course-studio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@course-studio/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@course-studio/ui/components/dropdown-menu";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@course-studio/ui/components/field";
import { Input } from "@course-studio/ui/components/input";
import { Separator } from "@course-studio/ui/components/separator";
import { toast } from "@course-studio/ui/components/sonner";
import { Spinner } from "@course-studio/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Mail, RefreshCw, Trash2, UserRoundX } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { courseQueries } from "../../queries";
import { courseRepository } from "../../repository";
import { createInvitationInputSchema } from "../../schemas";
import type {
	Course,
	CourseInvitation,
	CourseMember,
	InvitationRole,
} from "../../types";
import styles from "./ShareCourseDialog.module.css";

type PendingRemoval =
	| { kind: "member"; record: CourseMember }
	| { kind: "invitation"; record: CourseInvitation };

export function ShareCourseDialog({
	course,
	open,
	onOpenChange,
}: {
	course: Course;
	open: boolean;
	onOpenChange(open: boolean): void;
}) {
	const queryClient = useQueryClient();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<InvitationRole>("editor");
	const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval>();
	const membersQuery = useQuery({
		...courseQueries.members(course.id),
		enabled: open,
	});
	const invitationsQuery = useQuery({
		...courseQueries.invitations(course.id),
		enabled: open,
	});
	const invite = useMutation({
		mutationFn: () =>
			courseRepository.createInvitation(course.id, { email, role }),
		onSuccess: async () => {
			setEmail("");
			toast.success("Invitation sent");
			await queryClient.invalidateQueries({
				queryKey: courseQueries.invitations(course.id).queryKey,
				exact: true,
			});
		},
	});
	const resend = useMutation({
		mutationFn: (invitationId: string) =>
			courseRepository.resendInvitation(course.id, invitationId),
		onSuccess: async () => {
			toast.success("Invitation resent");
			await queryClient.invalidateQueries({
				queryKey: courseQueries.invitations(course.id).queryKey,
				exact: true,
			});
		},
		onError: () => toast.error("Couldn't resend invitation"),
	});
	const remove = useMutation({
		mutationFn: async (target: PendingRemoval) => {
			if (target.kind === "member") {
				await courseRepository.removeMember(course.id, target.record.id);
				return;
			}
			await courseRepository.revokeInvitation(course.id, target.record.id);
		},
		onSuccess: async (_, target) => {
			setPendingRemoval(undefined);
			toast.success(
				target.kind === "member" ? "Member removed" : "Invitation revoked",
			);
			await queryClient.invalidateQueries({
				queryKey:
					target.kind === "member"
						? courseQueries.members(course.id).queryKey
						: courseQueries.invitations(course.id).queryKey,
				exact: true,
			});
		},
	});
	const parsedInvite = createInvitationInputSchema.safeParse({ email, role });
	const queryError = membersQuery.error ?? invitationsQuery.error;

	const submitInvite = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (parsedInvite.success) {
			invite.mutate();
		}
	};

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

					<form onSubmit={submitInvite}>
						<FieldGroup className={styles.inviteFields}>
							<Field data-invalid={invite.isError}>
								<FieldLabel htmlFor="invite-email">Email address</FieldLabel>
								<Input
									id="invite-email"
									type="email"
									autoComplete="email"
									placeholder="collaborator@example.com"
									value={email}
									onChange={(event) => {
										setEmail(event.target.value);
										invite.reset();
									}}
									aria-invalid={invite.isError}
								/>
								{invite.error ? (
									<FieldError>{invite.error.message}</FieldError>
								) : null}
							</Field>
							<Field>
								<FieldLabel id="invite-role-label">Access</FieldLabel>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												type="button"
												variant="outline"
												className={styles.roleTrigger}
												aria-labelledby="invite-role-label"
											/>
										}
									>
										{role === "editor" ? "Can edit" : "Can view"}
										<ChevronDown data-icon="inline-end" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start">
										<DropdownMenuRadioGroup
											value={role}
											onValueChange={(value) =>
												setRole(value as InvitationRole)
											}
										>
											<DropdownMenuLabel>Course access</DropdownMenuLabel>
											<DropdownMenuRadioItem value="editor" closeOnClick>
												Can edit
											</DropdownMenuRadioItem>
											<DropdownMenuRadioItem value="viewer" closeOnClick>
												Can view
											</DropdownMenuRadioItem>
										</DropdownMenuRadioGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</Field>
							<Button
								type="submit"
								disabled={!parsedInvite.success || invite.isPending}
							>
								{invite.isPending ? (
									<Spinner data-icon="inline-start" />
								) : (
									<Mail data-icon="inline-start" />
								)}
								Invite
							</Button>
						</FieldGroup>
					</form>

					<Separator />
					<div className={styles.accessList}>
						<section aria-labelledby="members-title">
							<h3 id="members-title">People with access</h3>
							{membersQuery.isPending ? (
								<Spinner className={styles.loader} />
							) : null}
							{membersQuery.data?.length === 0 ? (
								<p className={styles.empty}>No collaborators yet.</p>
							) : null}
							{membersQuery.data?.map((member) => (
								<PersonRow
									key={member.id}
									member={member}
									onRemove={() =>
										setPendingRemoval({ kind: "member", record: member })
									}
								/>
							))}
						</section>
						<section aria-labelledby="invitations-title">
							<h3 id="invitations-title">Pending invitations</h3>
							{invitationsQuery.isPending ? (
								<Spinner className={styles.loader} />
							) : null}
							{invitationsQuery.data?.length === 0 ? (
								<p className={styles.empty}>No pending invitations.</p>
							) : null}
							{invitationsQuery.data?.map((invitation) => (
								<InvitationRow
									key={invitation.id}
									invitation={invitation}
									resending={
										resend.isPending && resend.variables === invitation.id
									}
									onResend={() => resend.mutate(invitation.id)}
									onRevoke={() =>
										setPendingRemoval({
											kind: "invitation",
											record: invitation,
										})
									}
								/>
							))}
						</section>
						{queryError ? (
							<p className={styles.error} role="alert">
								Couldn't load course access. Try again.
							</p>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={Boolean(pendingRemoval)}
				onOpenChange={(nextOpen) => {
					if (!nextOpen && !remove.isPending) {
						setPendingRemoval(undefined);
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
						{remove.error ? (
							<p className={styles.error} role="alert">
								{remove.error.message}
							</p>
						) : null}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={remove.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={remove.isPending}
							onClick={() => {
								if (pendingRemoval) {
									remove.mutate(pendingRemoval);
								}
							}}
						>
							{remove.isPending ? <Spinner data-icon="inline-start" /> : null}
							{pendingRemoval?.kind === "member"
								? "Remove access"
								: "Revoke invitation"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function PersonRow({
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

function InvitationRow({
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
				<span>Expires {invitation.expiresAt.toLocaleDateString()}</span>
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

function initials(name: string) {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
}

function roleLabel(role: InvitationRole) {
	return role === "editor" ? "Editor" : "Viewer";
}
