import { Deck, Markdown } from "@revealjs/react";

import "reveal.js/reveal.css";
import "reveal.js/theme/black.css";
import styles from "./Presentation.module.css";

export type PresentationProps = {
	markdown: string;
};

export function Presentation({ markdown }: PresentationProps) {
	return (
		<div className={styles.presentation}>
			<Deck
				className={styles.deck}
				config={{ embedded: true, keyboardCondition: "focused" }}
			>
				<Markdown>{markdown}</Markdown>
			</Deck>
		</div>
	);
}
