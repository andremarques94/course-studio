import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { SubmitEvent } from "react";
import { z } from "zod";
import { authClient } from "./auth-client";

const credentialsSchema = z.object({
	email: z.email("Enter a valid email address."),
	password: z.string().min(8, "Use at least 8 characters."),
});

const signUpSchema = credentialsSchema
	.extend({
		name: z.string().trim().min(1, "Enter your full name."),
		confirmPassword: z.string(),
	})
	.refine(({ confirmPassword, password }) => confirmPassword === password, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

type AuthMode = "sign-in" | "sign-up";

type SocialProvider = "github" | "google";

type AuthRequest =
	| { type: "email"; formData: FormData }
	| { type: SocialProvider };

type UseAuthFormOptions = {
	mode: AuthMode;
	redirect: string;
};

export function useAuthForm({ mode, redirect }: UseAuthFormOptions) {
	const navigate = useNavigate();
	const authenticate = useMutation({
		mutationFn: async (request: AuthRequest) => {
			if (request.type !== "email") {
				const result = await authClient.signIn.social({
					callbackURL: new URL(redirect, window.location.origin).toString(),
					provider: request.type,
				});
				if (result?.error) {
					const providerName = request.type === "github" ? "GitHub" : "Google";
					throw new Error(`${providerName} sign-in is unavailable.`);
				}
				return;
			}

			const values = Object.fromEntries(request.formData);
			const result =
				mode === "sign-up" ? await signUp(values) : await signIn(values);
			if (result.error) {
				throw new Error("Unable to authenticate with those details.");
			}

			await navigate({ to: redirect });
		},
	});
	const pendingRequest = authenticate.isPending
		? authenticate.variables?.type
		: undefined;

	return {
		error: authenticate.error?.message,
		handleEmailSubmit(event: SubmitEvent<HTMLFormElement>) {
			event.preventDefault();
			if (authenticate.isPending) {
				return;
			}
			authenticate.mutate({
				type: "email",
				formData: new FormData(event.currentTarget),
			});
		},
		handleGitHubSignIn() {
			if (authenticate.isPending) {
				return;
			}
			authenticate.mutate({ type: "github" });
		},
		handleGoogleSignIn() {
			if (authenticate.isPending) {
				return;
			}
			authenticate.mutate({ type: "google" });
		},
		isEmailPending: pendingRequest === "email",
		isGitHubPending: pendingRequest === "github",
		isGooglePending: pendingRequest === "google",
	};
}

function signIn(values: unknown) {
	const result = credentialsSchema.safeParse(values);
	if (!result.success) {
		throw new Error(result.error.issues[0]?.message ?? "Invalid credentials.");
	}
	return authClient.signIn.email(result.data);
}

function signUp(values: unknown) {
	const result = signUpSchema.safeParse(values);
	if (!result.success) {
		throw new Error(
			result.error.issues[0]?.message ?? "Invalid account details.",
		);
	}
	const { confirmPassword: _, ...credentials } = result.data;
	return authClient.signUp.email(credentials);
}
