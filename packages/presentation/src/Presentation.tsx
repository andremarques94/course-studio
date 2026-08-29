import type { PresentationTheme } from "@course-studio/themes";
import { Deck, Markdown } from "@revealjs/react";
import { type Ref, useImperativeHandle, useRef } from "react";
import type { RevealApi } from "reveal.js";

import "reveal.js/reveal.css";
import "@course-studio/themes/styles.css";
import "./reveal-adapter.css";
import styles from "./Presentation.module.css";
import { getThemeStyle } from "./theme-style";

export type PresentationProps = {
	markdown: string;
	theme: PresentationTheme;
	presentationRef?: Ref<PresentationHandle>;
};

export interface PresentationHandle {
	focus: () => void;
}

export function Presentation({
	markdown,
	theme,
	presentationRef,
}: PresentationProps) {
	const deckRef = useRef<RevealApi | null>(null);

	useImperativeHandle(presentationRef, () => ({
		focus: () => {
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}

			deckRef.current
				?.getRevealElement()
				?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		},
	}));

	return (
		<div
			className={styles.presentation}
			data-presentation-base-theme={theme.baseThemeId}
			data-presentation-theme={theme.id}
			style={getThemeStyle(theme)}
		>
			<Deck
				deckRef={deckRef}
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
