import "@course-studio/ui/globals.css";
import { Button } from "@course-studio/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@course-studio/ui/components/empty";
import { Toaster } from "@course-studio/ui/components/sonner";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TriangleAlert } from "lucide-react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "@/features/appearance";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Course Studio",
			},
			{
				name: "description",
				content:
					"Write course lessons in Markdown and preview slides as you type.",
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg",
			},
		],
	}),
	errorComponent: RootError,
	shellComponent: RootDocument,
});

function RootError({ reset }: { reset: () => void }) {
	return (
		<main>
			<Empty className="min-h-dvh rounded-none" role="alert">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<TriangleAlert />
					</EmptyMedia>
					<EmptyTitle>Couldn't load this page</EmptyTitle>
					<EmptyDescription>Try loading it again.</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button type="button" variant="outline" onClick={reset}>
						Try again
					</Button>
				</EmptyContent>
			</Empty>
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<MotionConfig reducedMotion="user">
					<ThemeProvider>
						{children}
						<Toaster />
					</ThemeProvider>
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				</MotionConfig>
				<Scripts />
			</body>
		</html>
	);
}
