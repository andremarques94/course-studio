import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/studio")({
	ssr: "data-only",
	head: () => ({
		meta: [{ title: "Studio | Course Studio" }],
	}),
	component: StudioLayout,
});

function StudioLayout() {
	return <Outlet />;
}
