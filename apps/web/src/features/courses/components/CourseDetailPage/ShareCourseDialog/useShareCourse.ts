import { toast } from "@course-studio/ui/components/sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type SubmitEvent, useState } from "react";
import { courseQueries } from "../../../queries";
import { courseRepository } from "../../../repository";
import { createInvitationInputSchema } from "../../../schemas";
import type {
	CourseInvitation,
	CourseMember,
	InvitationRole,
} from "../../../types";

export type PendingRemoval =
	| { kind: "member"; record: CourseMember }
	| { kind: "invitation"; record: CourseInvitation };

export function useShareCourse(courseId: string, open: boolean) {
	const queryClient = useQueryClient();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<InvitationRole>("editor");
	const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval>();

	const membersQuery = useQuery({
		...courseQueries.members(courseId),
		enabled: open,
	});
	const invitationsQuery = useQuery({
		...courseQueries.invitations(courseId),
		enabled: open,
	});

	const invite = useMutation({
		mutationFn: () =>
			courseRepository.createInvitation(courseId, { email, role }),
		onSuccess: () => {
			setEmail("");
			toast.success("Invitation sent");
		},
		onSettled: async () => {
			await queryClient.invalidateQueries({
				queryKey: courseQueries.invitations(courseId).queryKey,
				exact: true,
			});
		},
	});

	const resend = useMutation({
		mutationFn: (invitationId: string) =>
			courseRepository.resendInvitation(courseId, invitationId),
		onSuccess: () => {
			toast.success("Invitation resent");
		},
		onSettled: async () => {
			await queryClient.invalidateQueries({
				queryKey: courseQueries.invitations(courseId).queryKey,
				exact: true,
			});
		},
		onError: (error) => toast.error(error.message),
	});

	const remove = useMutation({
		mutationFn: async (target: PendingRemoval) => {
			if (target.kind === "member") {
				await courseRepository.removeMember(courseId, target.record.id);
				return;
			}
			await courseRepository.revokeInvitation(courseId, target.record.id);
		},
		onSuccess: async (_, target) => {
			setPendingRemoval(undefined);
			toast.success(
				target.kind === "member" ? "Member removed" : "Invitation revoked",
			);
			await queryClient.invalidateQueries({
				queryKey:
					target.kind === "member"
						? courseQueries.members(courseId).queryKey
						: courseQueries.invitations(courseId).queryKey,
				exact: true,
			});
		},
	});

	const parsedInvite = createInvitationInputSchema.safeParse({ email, role });
	const emailError = getInviteEmailError(email, parsedInvite, invite.error);

	function submitInvite(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (parsedInvite.success) {
			invite.mutate();
		}
	}

	function changeEmail(value: string) {
		setEmail(value);
		invite.reset();
	}

	return {
		email,
		role,
		setRole,
		changeEmail,
		pendingRemoval,
		setPendingRemoval,
		resendingId: resend.isPending ? resend.variables : undefined,
		membersQuery,
		invitationsQuery,
		invite,
		resend,
		remove,
		parsedInvite,
		emailError,
		queryError: membersQuery.error ?? invitationsQuery.error,
		submitInvite,
	};
}

export type ShareCourse = ReturnType<typeof useShareCourse>;

function getInviteEmailError(
	email: string,
	parsedInvite: ReturnType<typeof createInvitationInputSchema.safeParse>,
	serverError?: Error | null,
) {
	if (serverError) {
		return serverError.message;
	}
	if (email.length === 0 || parsedInvite.success) {
		return undefined;
	}
	return (
		parsedInvite.error.issues[0]?.message ?? "Enter a valid email address."
	);
}
