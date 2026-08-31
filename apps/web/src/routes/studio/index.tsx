import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/")({
	beforeLoad: () => {
		throw redirect({ to: "/studio/courses" });
	},
});
