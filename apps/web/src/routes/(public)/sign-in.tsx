import { createFileRoute } from "@tanstack/react-router";
import { AuthForm, getSafeAuthRedirect } from "@/features/auth";

export const Route = createFileRoute("/(public)/sign-in")({
	ssr: false,
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: getSafeAuthRedirect(search.redirect),
	}),
	head: () => ({ meta: [{ title: "Sign in | Course Studio" }] }),
	component: SignInPage,
});

function SignInPage() {
	return <AuthForm mode="sign-in" redirect={Route.useSearch().redirect} />;
}
