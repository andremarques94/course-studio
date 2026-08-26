import { useEffect } from "react";
import type { Theme } from "../../theme.types";

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	root.classList.remove("light", "dark");

	const resolved =
		theme === "system"
			? window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light"
			: theme;

	root.classList.add(resolved);
	root.style.colorScheme = resolved;
}

export function useApplyTheme(theme: Theme, mounted: boolean) {
	useEffect(() => {
		if (!mounted) {
			return;
		}
		applyTheme(theme);
	}, [theme, mounted]);

	useEffect(() => {
		if (!mounted || theme !== "system") {
			return;
		}

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyTheme("system");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [theme, mounted]);
}
