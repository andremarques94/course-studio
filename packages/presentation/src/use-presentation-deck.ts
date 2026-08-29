import { type Ref, useImperativeHandle, useRef } from "react";
import type { RevealApi } from "reveal.js";

export type PresentationHandle = {
	focus: () => void;
};

export function usePresentationDeck(
	presentationRef?: Ref<PresentationHandle>,
	onPdfReady?: () => void,
) {
	const deckRef = useRef<RevealApi | null>(null);

	const handleReady = (deck: RevealApi) => {
		if (!onPdfReady || deck.getConfig().view !== "print") {
			return;
		}

		let notified = false;
		const notifyPdfReady = () => {
			if (notified) {
				return;
			}

			notified = true;
			deck.off("pdf-ready", notifyPdfReady);
			deck
				.getRevealElement()
				?.querySelectorAll(".pdf-page section[hidden]")
				.forEach((slide) => {
					slide.removeAttribute("hidden");
					slide.removeAttribute("aria-hidden");
				});
			requestAnimationFrame(onPdfReady);
		};

		deck.on("pdf-ready", notifyPdfReady);
		if (deck.getRevealElement()?.querySelector(".pdf-page")) {
			notifyPdfReady();
		}
	};

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

	return { deckRef, handleReady };
}
