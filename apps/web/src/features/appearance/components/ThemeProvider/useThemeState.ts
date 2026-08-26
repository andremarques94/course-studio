import { useEffect, useState } from "react";
import type { Theme } from "../../theme.types";

export function useThemeState(defaultTheme: Theme, storageKey: string) {
	const [theme, setThemeState] = useState<Theme>(defaultTheme);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem(storageKey);
		setThemeState(
			stored === "light" || stored === "dark" || stored === "system"
				? stored
				: defaultTheme,
		);
		setMounted(true);
	}, [defaultTheme, storageKey]);

	const setTheme = (next: Theme) => {
		localStorage.setItem(storageKey, next);
		setThemeState(next);
	};

	return { theme, setTheme, mounted };
}
