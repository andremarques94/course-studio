import { createFileRoute } from "@tanstack/react-router";
import { AuthForm, getSafeAuthRedirect } from "@/features/auth";

export const Route = createFileRoute("/(public)/sign-up")({
	ssr: false,
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: getSafeAuthRedirect(search.redirect),
	}),
	head: () => ({ meta: [{ title: "Create account | Course Studio" }] }),
	component: SignUpPage,
});

function SignUpPage() {
	return <AuthForm mode="sign-up" redirect={Route.useSearch().redirect} />;
}
