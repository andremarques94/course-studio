import { Alert, AlertDescription } from "@course-studio/ui/components/alert";
import { CardContent } from "@course-studio/ui/components/card";
import { TriangleAlert } from "lucide-react";
import type { AuthSession } from "@/features/auth/auth-client";
import styles from "./InvitationAccept.module.css";

export function InvitationStatus({
	invitationPath,
	acceptError,
	session,
}: {
	invitationPath?: string;
	acceptError?: Error | null;
	session: AuthSession | null;
}) {
	if (!invitationPath) {
		return (
			<CardContent className={styles.content}>
				<Alert variant="destructive" role="alert">
					<TriangleAlert />
					<AlertDescription>
						This invitation link looks incomplete. Ask the sender for a fresh
						invite.
					</AlertDescription>
				</Alert>
			</CardContent>
		);
	}

	if (acceptError) {
		return (
			<CardContent className={styles.content}>
				<Alert variant="destructive" role="alert">
					<TriangleAlert />
					<AlertDescription>
						{acceptError.message} Make sure you are signed in with the invited
						email address.
					</AlertDescription>
				</Alert>
			</CardContent>
		);
	}

	if (!session) {
		return (
			<CardContent className={styles.content}>
				<p>Sign in or create an account with the invited email address.</p>
			</CardContent>
		);
	}

	if (!session.user.emailVerified) {
		return (
			<CardContent className={styles.content}>
				<Alert>
					<AlertDescription>
						Verify your email address before accepting this invitation — check
						your inbox, then sign in to return here.
					</AlertDescription>
				</Alert>
			</CardContent>
		);
	}

	return (
		<CardContent className={styles.content}>
			<p>You are signed in as {session.user.email}.</p>
			<p>Accept with the email address the invitation was sent to.</p>
		</CardContent>
	);
}
