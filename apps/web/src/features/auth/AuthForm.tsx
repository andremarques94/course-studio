import { Alert, AlertDescription } from "@course-studio/ui/components/alert";
import { Button, buttonVariants } from "@course-studio/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@course-studio/ui/components/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@course-studio/ui/components/field";
import { Input } from "@course-studio/ui/components/input";
import { Spinner } from "@course-studio/ui/components/spinner";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { PublicHeader } from "@/components/app-shell";
import { ModeToggle } from "@/features/appearance";
import styles from "./AuthForm.module.css";
import { useAuthForm } from "./use-auth-form";

type AuthFormProps = {
	mode: "sign-in" | "sign-up";
	redirect: string;
};

export function AuthForm({ mode, redirect }: AuthFormProps) {
	const isSignUp = mode === "sign-up";
	const {
		error,
		handleEmailSubmit,
		handleGitHubSignIn,
		handleGoogleSignIn,
		isEmailPending,
		isGitHubPending,
		isGooglePending,
	} = useAuthForm({ mode, redirect });

	return (
		<div className={styles.page}>
			<PublicHeader>
				<Link
					to="/"
					className={buttonVariants({ variant: "ghost", size: "sm" })}
				>
					<ArrowLeft data-icon="inline-start" />
					Back to home
				</Link>
				<span className={styles.actionDivider} aria-hidden="true" />
				<ModeToggle />
			</PublicHeader>

			<main className={styles.main}>
				<div className={styles.container}>
					<Card className={styles.card}>
						<CardHeader className={styles.header}>
							<CardTitle className={styles.title}>
								{isSignUp ? "Create your account" : "Welcome back"}
							</CardTitle>
							<CardDescription>
								{isSignUp
									? "Start creating collaborative course lessons."
									: "Sign in to continue to your studio."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleEmailSubmit}>
								<FieldGroup>
									{error && (
										<Alert variant="destructive">
											<TriangleAlert />
											<AlertDescription>{error}</AlertDescription>
										</Alert>
									)}
									{isSignUp && (
										<Field>
											<FieldLabel htmlFor="name">Full name</FieldLabel>
											<Input
												id="name"
												name="name"
												autoComplete="name"
												required
											/>
										</Field>
									)}
									<Field>
										<FieldLabel htmlFor="email">Email</FieldLabel>
										<Input
											id="email"
											name="email"
											type="email"
											autoComplete="email"
											placeholder="you@example.com"
											required
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="password">Password</FieldLabel>
										<Input
											id="password"
											name="password"
											type="password"
											autoComplete={
												isSignUp ? "new-password" : "current-password"
											}
											minLength={8}
											required
										/>
										{isSignUp && (
											<FieldDescription>
												Use at least 8 characters.
											</FieldDescription>
										)}
									</Field>
									{isSignUp && (
										<Field>
											<FieldLabel htmlFor="confirmPassword">
												Confirm password
											</FieldLabel>
											<Input
												id="confirmPassword"
												name="confirmPassword"
												type="password"
												autoComplete="new-password"
												minLength={8}
												required
											/>
											{error === "Passwords do not match." && (
												<FieldError>{error}</FieldError>
											)}
										</Field>
									)}
									<Field>
										<Button type="submit" disabled={isEmailPending}>
											{isEmailPending && <Spinner data-icon="inline-start" />}
											{isSignUp ? "Create account" : "Sign in"}
										</Button>
									</Field>
									<FieldSeparator className={styles.separator}>
										Or continue with
									</FieldSeparator>
									<Field>
										<Button
											type="button"
											variant="outline"
											disabled={isGooglePending || isGitHubPending}
											onClick={handleGoogleSignIn}
										>
											{isGooglePending ? (
												<Spinner data-icon="inline-start" />
											) : (
												<svg
													data-icon="inline-start"
													viewBox="0 0 24 24"
													aria-hidden="true"
												>
													<path
														fill="#4285F4"
														d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
													/>
													<path
														fill="#34A853"
														d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
													/>
													<path
														fill="#FBBC05"
														d="M6.39 13.93A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"
													/>
													<path
														fill="#EA4335"
														d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
													/>
												</svg>
											)}
											Continue with Google
										</Button>
									</Field>
									<Field>
										<Button
											type="button"
											variant="outline"
											disabled={isGooglePending || isGitHubPending}
											onClick={handleGitHubSignIn}
										>
											{isGitHubPending ? (
												<Spinner data-icon="inline-start" />
											) : (
												<svg
													data-icon="inline-start"
													viewBox="0 0 24 24"
													aria-hidden="true"
												>
													<path
														fill="currentColor"
														d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.39.97.1-.75.4-1.27.74-1.56-2.58-.3-5.29-1.29-5.29-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.96 10.96 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.72 5.39-5.3 5.68.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"
													/>
												</svg>
											)}
											Continue with GitHub
										</Button>
									</Field>
									<Field>
										<FieldDescription className={styles.footer}>
											{isSignUp
												? "Already have an account? "
												: "New to Course Studio? "}
											<Link
												to={isSignUp ? "/sign-in" : "/sign-up"}
												search={{ redirect }}
											>
												{isSignUp ? "Sign in" : "Create an account"}
											</Link>
										</FieldDescription>
									</Field>
								</FieldGroup>
							</form>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
