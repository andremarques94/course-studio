import { useBlocker } from "@tanstack/react-router";
import { useEffectEvent } from "react";
import type { StudioDraft } from "../draft";

export function useDraftNavigationBlocker(
	draft: Pick<StudioDraft, "flush" | "isUnsafeToLeave">,
) {
	const flushBeforeNavigation = useEffectEvent(async () => {
		if (!draft.isUnsafeToLeave) {
			return false;
		}
		try {
			await draft.flush();
			return false;
		} catch {
			return true;
		}
	});

	useBlocker({
		shouldBlockFn: flushBeforeNavigation,
		enableBeforeUnload: draft.isUnsafeToLeave,
	});
}
