import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/features/studio/components";

export const Route = createFileRoute("/studio/")({
	component: Studio,
});
