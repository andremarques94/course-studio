import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import type { RevealApi } from "reveal.js";

export type PresentationHandle = {
	focus: () => void;
};

export function usePresentationDeck(
	presentationRef?: Ref<PresentationHandle>,
	onPdfReady?: () => void,
) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const deckRef = useRef<RevealApi | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || typeof ResizeObserver === "undefined") {
			return;
		}
		let layoutFrame: number | null = null;
		const observer = new ResizeObserver(() => {
			const deck = deckRef.current;
			if (!deck || deck.getConfig().view === "print") {
				return;
			}
			if (layoutFrame !== null) {
				cancelAnimationFrame(layoutFrame);
			}
			layoutFrame = requestAnimationFrame(() => {
				layoutFrame = null;
				deck.layout();
			});
		});
		observer.observe(container);
		return () => {
			observer.disconnect();
			if (layoutFrame !== null) {
				cancelAnimationFrame(layoutFrame);
			}
		};
	}, []);

	const handleReady = (deck: RevealApi) => {
		const isPrintView = deck.getConfig().view === "print";
		if (!onPdfReady || !isPrintView) {
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

	return { containerRef, deckRef, handleReady };
}
