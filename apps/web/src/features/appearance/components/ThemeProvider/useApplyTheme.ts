import { useEffect } from "react";
import type { Theme } from "../../theme.types";

export function applyTheme(theme: Theme) {
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

function readTheme(storageKey: string, defaultTheme: Theme): Theme {
	const stored = localStorage.getItem(storageKey);
	return stored === "light" || stored === "dark" || stored === "system"
		? stored
		: defaultTheme;
}

export function useApplyTheme(storageKey: string, defaultTheme: Theme) {
	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyTheme(readTheme(storageKey, defaultTheme));
		onChange();
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [defaultTheme, storageKey]);
}
