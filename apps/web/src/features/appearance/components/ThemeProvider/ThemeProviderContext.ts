import { createContext } from "react";
import type { Theme } from "../../theme.types";

type ThemeProviderState = {
	setTheme: (theme: Theme) => void;
};

export const ThemeProviderContext = createContext<ThemeProviderState>({
	setTheme: () => {},
});
