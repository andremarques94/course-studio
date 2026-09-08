import { Button, buttonVariants } from "@course-studio/ui/components/button";
import { CardFooter } from "@course-studio/ui/components/card";
import { Spinner } from "@course-studio/ui/components/spinner";
import { Link } from "@tanstack/react-router";
import type { AuthSession } from "@/features/auth/auth-client";
import styles from "./InvitationAccept.module.css";

export function InvitationActions({
	invitationPath,
	acceptError,
	acceptPending,
	session,
	signingOut,
	onRetry,
	onAccept,
	onSwitchAccount,
}: {
	invitationPath?: string;
	acceptError?: Error | null;
	acceptPending: boolean;
	session: AuthSession | null;
	signingOut: boolean;
	onRetry(): void;
	onAccept(): void;
	onSwitchAccount(): void;
}) {
	if (!invitationPath) {
		return null;
	}

	if (acceptError) {
		return (
			<CardFooter className={styles.actions}>
				<Button type="button" onClick={onRetry} disabled={acceptPending}>
					{acceptPending ? <Spinner data-icon="inline-start" /> : null}
					Try again
				</Button>
				{session ? (
					<Button
						type="button"
						variant="outline"
						onClick={onSwitchAccount}
						disabled={signingOut}
					>
						{signingOut ? <Spinner data-icon="inline-start" /> : null}
						Switch accounts
					</Button>
				) : null}
			</CardFooter>
		);
	}

	if (!session) {
		return (
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
		);
	}

	if (!session.user.emailVerified) {
		return (
			<CardFooter className={styles.actions}>
				<Link
					to="/sign-in"
					search={{ redirect: invitationPath }}
					className={buttonVariants()}
				>
					Go to sign-in
				</Link>
				<Button
					type="button"
					variant="outline"
					onClick={onSwitchAccount}
					disabled={signingOut}
				>
					{signingOut ? <Spinner data-icon="inline-start" /> : null}
					Switch accounts
				</Button>
			</CardFooter>
		);
	}

	return (
		<CardFooter className={styles.actions}>
			<Button type="button" onClick={onAccept} disabled={acceptPending}>
				{acceptPending ? <Spinner data-icon="inline-start" /> : null}
				Accept invitation
			</Button>
			<Button
				type="button"
				variant="outline"
				onClick={onSwitchAccount}
				disabled={signingOut || acceptPending}
			>
				{signingOut ? <Spinner data-icon="inline-start" /> : null}
				Switch accounts
			</Button>
		</CardFooter>
	);
}
