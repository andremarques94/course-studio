import { ScriptOnce } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Theme } from "../../theme.types";
import { getThemeScript } from "../../theme-script";
import { ThemeProviderContext } from "./ThemeProviderContext";
import { applyTheme, useApplyTheme } from "./useApplyTheme";

type ThemeProviderProps = {
	children: ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "theme",
}: ThemeProviderProps) {
	useApplyTheme(storageKey, defaultTheme);

	const setTheme = (theme: Theme) => {
		localStorage.setItem(storageKey, theme);
		applyTheme(theme);
	};

	return (
		<ThemeProviderContext value={{ setTheme }}>
			<ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
			{children}
		</ThemeProviderContext>
	);
}
