import { ScriptOnce } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Theme } from "../../theme.types";
import { getThemeScript } from "../../theme-script";
import { ThemeProviderContext } from "./ThemeProviderContext";
import { useApplyTheme } from "./useApplyTheme";
import { useThemeState } from "./useThemeState";

interface ThemeProviderProps {
	children: ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
}

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "theme",
}: ThemeProviderProps) {
	const { theme, setTheme, mounted } = useThemeState(defaultTheme, storageKey);
	useApplyTheme(theme, mounted);

	return (
		<ThemeProviderContext value={{ theme, setTheme }}>
			<ScriptOnce>{getThemeScript(storageKey, defaultTheme)}</ScriptOnce>
			{children}
		</ThemeProviderContext>
	);
}
