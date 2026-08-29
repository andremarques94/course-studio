import { BODY_SANS, CODE_MONO } from "../theme-fonts";
import type { BuiltinThemeRecipe } from "../theme-types";

export const minimalThemeRecipe = {
	name: "Minimal",
	tokens: {
		colors: {
			background: "#f7f7f5",
			foreground: "#20201e",
			heading: "#10100f",
			accent: "#d8322a",
			accentHover: "#a92520",
			muted: "#686863",
			selectionBackground: "#f1b7b2",
			selectionForeground: "#10100f",
			inlineCodeBackground: "#e9e9e5",
		},
		typography: {
			bodyFamily: BODY_SANS,
			headingFamily: BODY_SANS,
			codeFamily: CODE_MONO,
			bodySize: "44px",
			headingWeight: 600,
			headingLetterSpacing: "-0.045em",
			heading1Size: "2.7em",
			heading2Size: "1.7em",
			heading3Size: "1.2em",
		},
		spacing: {
			slidePadding: "116px 140px 104px",
		},
	},
} satisfies BuiltinThemeRecipe;
