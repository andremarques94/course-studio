import {
	Presentation,
	type PresentationHandle,
} from "@course-studio/presentation";
import type { PresentationTheme } from "@course-studio/themes";
import { memo, type Ref } from "react";

import styles from "./PresentationPreview.module.css";

interface PresentationPreviewProps {
	markdown: string;
	theme: PresentationTheme;
	presentationRef: Ref<PresentationHandle>;
}

function PresentationPreviewRoot({
	markdown,
	theme,
	presentationRef,
}: PresentationPreviewProps) {
	return (
		<div className={styles.preview}>
			<div className={styles.canvas}>
				<Presentation
					markdown={markdown}
					theme={theme}
					presentationRef={presentationRef}
				/>
			</div>
		</div>
	);
}

export const PresentationPreview = memo(PresentationPreviewRoot);
