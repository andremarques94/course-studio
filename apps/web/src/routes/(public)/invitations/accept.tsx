import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@course-studio/ui/components/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { PublicHeader } from "@/components/app-shell";
import { ModeToggle } from "@/features/appearance";
import { getInvitationPath } from "@/features/auth/redirect";
import { getSession } from "@/features/auth/session";
import {
	InvitationActions,
	InvitationStatus,
	useSwitchAccount,
} from "@/features/courses/components/InvitationAccept";
import styles from "@/features/courses/components/InvitationAccept/InvitationAccept.module.css";
import { courseQueries } from "@/features/courses/queries";
import { courseRepository } from "@/features/courses/repository";

export const Route = createFileRoute("/(public)/invitations/accept")({
	ssr: false,
	validateSearch: (search: Record<string, unknown>) => ({
		token: getInvitationPath(search.token) ? String(search.token) : undefined,
	}),
	beforeLoad: async () => ({ session: await getSession() }),
	head: () => ({ meta: [{ title: "Accept invitation | Course Studio" }] }),
	component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
	const { token } = Route.useSearch();
	const { session } = Route.useRouteContext();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { signingOut, switchAccount } = useSwitchAccount();
	const invitationPath = getInvitationPath(token);
	const accept = useMutation({
		mutationFn: () => courseRepository.acceptInvitation(token ?? ""),
		onSuccess: async ({ courseId }) => {
			await queryClient.invalidateQueries({
				queryKey: courseQueries.all().queryKey,
				exact: true,
			});
			await navigate({
				to: "/studio/courses/$courseId",
				params: { courseId },
			});
		},
	});

	return (
		<div className={styles.page}>
			<PublicHeader>
				<ModeToggle />
			</PublicHeader>
			<main className={styles.main}>
				<Card className={styles.card}>
					<CardHeader className={styles.header}>
						<div className={styles.icon} aria-hidden="true">
							<MailCheck />
						</div>
						<CardTitle>Course invitation</CardTitle>
						<CardDescription>
							Join the course to open its lessons in Course Studio.
						</CardDescription>
					</CardHeader>
					<InvitationStatus
						invitationPath={invitationPath}
						acceptError={accept.isError ? accept.error : null}
						session={session}
					/>
					<InvitationActions
						invitationPath={invitationPath}
						acceptError={accept.isError ? accept.error : null}
						acceptPending={accept.isPending}
						session={session}
						signingOut={signingOut}
						onRetry={() => {
							accept.reset();
							accept.mutate();
						}}
						onAccept={() => accept.mutate()}
						onSwitchAccount={switchAccount}
					/>
				</Card>
			</main>
		</div>
	);
}
