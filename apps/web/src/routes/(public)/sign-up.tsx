import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/features/auth/AuthForm";
import { getSafeStudioRedirect } from "@/features/auth/session";

export const Route = createFileRoute("/(public)/sign-up")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: getSafeStudioRedirect(search.redirect),
	}),
	head: () => ({ meta: [{ title: "Create account | Course Studio" }] }),
	component: SignUpPage,
});

function SignUpPage() {
	return <AuthForm mode="sign-up" redirect={Route.useSearch().redirect} />;
}
