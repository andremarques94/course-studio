import type { PresentationTheme } from "@course-studio/themes";
import { Deck, Markdown } from "@revealjs/react";
import type { Ref } from "react";

import "reveal.js/reveal.css";
import "@course-studio/themes/styles.css";
import "./reveal-adapter.css";
import styles from "./Presentation.module.css";
import { getThemeStyle } from "./theme-style";
import {
	type PresentationHandle,
	usePresentationDeck,
} from "./use-presentation-deck";

export type { PresentationHandle } from "./use-presentation-deck";

export type PresentationProps = {
	markdown: string;
	theme: PresentationTheme;
	presentationRef?: Ref<PresentationHandle>;
	onPdfReady?: () => void;
};

export function Presentation({
	markdown,
	theme,
	presentationRef,
	onPdfReady,
}: PresentationProps) {
	const { deckRef, handleReady } = usePresentationDeck(
		presentationRef,
		onPdfReady,
	);

	return (
		<div
			className={styles.presentation}
			data-presentation-base-theme={theme.baseThemeId}
			data-presentation-theme={theme.id}
			style={getThemeStyle(theme)}
		>
			<Deck
				deckRef={deckRef}
				onReady={handleReady}
				className={`${styles.deck} course-studio-presentation`}
				config={{
					center: false,
					embedded: true,
					height: 900,
					keyboardCondition: "focused",
					margin: 0,
					width: 1600,
				}}
			>
				<Markdown data-presentation-slide="">{markdown}</Markdown>
			</Deck>
		</div>
	);
}
