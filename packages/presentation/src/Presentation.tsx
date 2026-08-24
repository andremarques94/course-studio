import { Deck, Markdown } from "@revealjs/react";

import "reveal.js/reveal.css";
import "reveal.js/theme/black.css";

export type PresentationProps = {
	markdown: string;
};

export function Presentation({ markdown }: PresentationProps) {
	return (
		<Deck>
			<Markdown>{markdown}</Markdown>
		</Deck>
	);
}
