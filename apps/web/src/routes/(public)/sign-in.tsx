import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/features/auth/AuthForm";
import { getSafeStudioRedirect } from "@/features/auth/session";

export const Route = createFileRoute("/(public)/sign-in")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: getSafeStudioRedirect(search.redirect),
	}),
	head: () => ({ meta: [{ title: "Sign in | Course Studio" }] }),
	component: SignInPage,
});

function SignInPage() {
	return <AuthForm mode="sign-in" redirect={Route.useSearch().redirect} />;
}
