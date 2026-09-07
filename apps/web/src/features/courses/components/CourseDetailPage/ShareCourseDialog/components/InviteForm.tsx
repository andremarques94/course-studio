import { Button } from "@course-studio/ui/components/button";
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
import { Spinner } from "@course-studio/ui/components/spinner";
import { ChevronDown, Mail } from "lucide-react";
import type { SubmitEvent } from "react";
import type { InvitationRole } from "../../../../types";
import styles from "../ShareCourseDialog.module.css";

export function InviteForm({
	email,
	role,
	emailError,
	canSubmit,
	isPending,
	onEmailChange,
	onRoleChange,
	onSubmit,
}: {
	email: string;
	role: InvitationRole;
	emailError?: string;
	canSubmit: boolean;
	isPending: boolean;
	onEmailChange(value: string): void;
	onRoleChange(role: InvitationRole): void;
	onSubmit(event: SubmitEvent<HTMLFormElement>): void;
}) {
	return (
		<form onSubmit={onSubmit}>
			<FieldGroup className={styles.inviteFields}>
				<Field data-invalid={Boolean(emailError)}>
					<FieldLabel htmlFor="invite-email">Email address</FieldLabel>
					<Input
						id="invite-email"
						type="email"
						autoComplete="email"
						placeholder="collaborator@example.com"
						value={email}
						onChange={(event) => onEmailChange(event.target.value)}
						aria-invalid={Boolean(emailError)}
					/>
					{emailError ? <FieldError>{emailError}</FieldError> : null}
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
								onValueChange={(value) => onRoleChange(value as InvitationRole)}
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
				<Button type="submit" disabled={!canSubmit || isPending}>
					{isPending ? (
						<Spinner data-icon="inline-start" />
					) : (
						<Mail data-icon="inline-start" />
					)}
					Invite
				</Button>
			</FieldGroup>
		</form>
	);
}
