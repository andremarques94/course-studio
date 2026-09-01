import { Presentation } from "@course-studio/presentation";
import { getBuiltinTheme } from "@course-studio/themes";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@course-studio/ui/components/empty";
import { createFileRoute } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { readPdfExport } from "@/features/studio/export";

import styles from "./print.module.css";

export const Route = createFileRoute("/studio/print")({
	ssr: false,
	head: () => ({
		meta: [{ title: "Export PDF | Course Studio" }],
	}),
	component: PdfExport,
});

function PdfExport() {
	const payload = readPdfExport();

	if (!payload) {
		return (
			<main className={styles.error}>
				<Empty role="alert">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<TriangleAlert />
						</EmptyMedia>
						<EmptyTitle>Export unavailable</EmptyTitle>
						<EmptyDescription>
							Return to the editor and try again.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</main>
		);
	}

	const handlePdfReady = async () => {
		await document.fonts.ready;
		window.print();
	};

	return (
		<main className={styles.export}>
			<Presentation
				markdown={payload.markdown}
				theme={getBuiltinTheme(payload.themeId)}
				onPdfReady={handlePdfReady}
			/>
		</main>
	);
}
