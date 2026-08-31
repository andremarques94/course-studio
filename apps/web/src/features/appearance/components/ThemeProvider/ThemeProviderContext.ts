import { createContext } from "react";
import type { Theme } from "../../theme.types";

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

export const ThemeProviderContext = createContext<ThemeProviderState>({
	theme: "system",
	setTheme: () => {},
});
