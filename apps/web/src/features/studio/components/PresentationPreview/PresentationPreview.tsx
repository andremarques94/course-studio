import { Presentation } from "@course-studio/presentation";
import { memo } from "react";

import styles from "./PresentationPreview.module.css";

interface PresentationPreviewProps {
	markdown: string;
}

function PresentationPreviewRoot({ markdown }: PresentationPreviewProps) {
	return (
		<div className={styles.preview}>
			<div className={styles.canvas}>
				<Presentation markdown={markdown} />
			</div>
		</div>
	);
}

export const PresentationPreview = memo(PresentationPreviewRoot);
