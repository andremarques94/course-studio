import { Alert, AlertDescription } from "@course-studio/ui/components/alert";
import { Button, buttonVariants } from "@course-studio/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@course-studio/ui/components/card";
import { Spinner } from "@course-studio/ui/components/spinner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MailCheck, TriangleAlert } from "lucide-react";
import { PublicHeader } from "@/components/app-shell";
import { ModeToggle } from "@/features/appearance";
import { getInvitationPath } from "@/features/auth/redirect";
import { getSession } from "@/features/auth/session";
import { courseQueries } from "@/features/courses/queries";
import { courseRepository } from "@/features/courses/repository";
import styles from "./accept.module.css";

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
	const unavailable = !invitationPath || accept.isError;

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
					<CardContent className={styles.content}>
						{unavailable ? (
							<Alert variant="destructive" role="alert">
								<TriangleAlert />
								<AlertDescription>
									This invitation is invalid or no longer available.
								</AlertDescription>
							</Alert>
						) : !session ? (
							<p>
								Sign in or create an account with the invited email address.
							</p>
						) : !session.user.emailVerified ? (
							<Alert>
								<AlertDescription>
									Verify your email address before accepting this invitation.
								</AlertDescription>
							</Alert>
						) : (
							<p>You are signed in as {session.user.email}.</p>
						)}
					</CardContent>
					{invitationPath && !session ? (
						<CardFooter className={styles.actions}>
							<Link
								to="/sign-in"
								search={{ redirect: invitationPath }}
								className={buttonVariants()}
							>
								Sign in
							</Link>
							<Link
								to="/sign-up"
								search={{ redirect: invitationPath }}
								className={buttonVariants({ variant: "outline" })}
							>
								Create account
							</Link>
						</CardFooter>
					) : invitationPath &&
						session?.user.emailVerified &&
						!accept.isError ? (
						<CardFooter>
							<Button
								type="button"
								onClick={() => accept.mutate()}
								disabled={accept.isPending}
							>
								{accept.isPending ? <Spinner data-icon="inline-start" /> : null}
								Accept invitation
							</Button>
						</CardFooter>
					) : null}
				</Card>
			</main>
		</div>
	);
}
