import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/features/auth/session";

export const Route = createFileRoute("/studio")({
	ssr: "data-only",
	beforeLoad: async ({ location }) => {
		const session = await getSession();
		if (!session) {
			throw redirect({
				to: "/sign-in",
				search: { redirect: location.pathname },
			});
		}
		return { user: session.user };
	},
	head: () => ({
		meta: [{ title: "Studio | Course Studio" }],
	}),
	component: StudioLayout,
});

function StudioLayout() {
	return <Outlet />;
}
