import {
	Presentation,
	type PresentationHandle,
} from "@course-studio/presentation";
import type { PresentationTheme } from "@course-studio/themes";
import { memo, type Ref } from "react";

import styles from "./PresentationPreview.module.css";

type PresentationPreviewProps = {
	markdown: string;
	theme: PresentationTheme;
	presentationRef: Ref<PresentationHandle>;
	focused?: boolean;
};

function PresentationPreviewRoot({
	markdown,
	theme,
	presentationRef,
	focused = false,
}: PresentationPreviewProps) {
	return (
		<div className={styles.preview} data-focused={focused}>
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
