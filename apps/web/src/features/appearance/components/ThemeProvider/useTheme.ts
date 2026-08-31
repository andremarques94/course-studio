import { useContext } from "react";
import { isDefined } from "remeda";
import { ThemeProviderContext } from "./ThemeProviderContext";

export function useTheme() {
	const context = useContext(ThemeProviderContext);
	if (!isDefined(context)) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
