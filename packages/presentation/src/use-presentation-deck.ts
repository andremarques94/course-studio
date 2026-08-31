import { type Ref, type RefObject, useImperativeHandle, useRef } from "react";
import { isNonNull } from "remeda";
import type { RevealApi } from "reveal.js";
import { useResizeObserver, useUnmount } from "usehooks-ts";

export type PresentationHandle = {
	focus: () => void;
};

export function usePresentationDeck(
	presentationRef?: Ref<PresentationHandle>,
	onPdfReady?: () => void,
) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const deckRef = useRef<RevealApi | null>(null);
	const layoutFrameRef = useRef<number | null>(null);

	useResizeObserver({
		ref: containerRef as RefObject<HTMLDivElement>,
		onResize: () => {
			const deck = deckRef.current;
			if (!deck || deck.getConfig().view === "print") {
				return;
			}

			if (isNonNull(layoutFrameRef.current)) {
				cancelAnimationFrame(layoutFrameRef.current);
			}

			layoutFrameRef.current = requestAnimationFrame(() => {
				layoutFrameRef.current = null;
				deck.layout();
			});
		},
	});

	useUnmount(() => {
		if (isNonNull(layoutFrameRef.current)) {
			cancelAnimationFrame(layoutFrameRef.current);
		}
	});

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
