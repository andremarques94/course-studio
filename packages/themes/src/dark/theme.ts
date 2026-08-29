import { BODY_SANS, CODE_MONO } from "../theme-fonts";
import type { BuiltinThemeRecipe } from "../theme-types";

export const darkThemeRecipe = {
	name: "Dark",
	tokens: {
		colors: {
			background: "#121211",
			foreground: "#d8d5ce",
			heading: "#f3f0e9",
			accent: "#d9ae5f",
			accentHover: "#f0ca7d",
			muted: "#918e87",
			selectionBackground: "#68542e",
			selectionForeground: "#fffaf0",
			inlineCodeBackground: "#242320",
		},
		typography: {
			bodyFamily: BODY_SANS,
			headingFamily: BODY_SANS,
			codeFamily: CODE_MONO,
			bodySize: "43px",
			headingWeight: 500,
			headingLetterSpacing: "-0.04em",
			heading1Size: "2.65em",
			heading2Size: "1.68em",
			heading3Size: "1.2em",
		},
		spacing: {
			slidePadding: "118px 144px 106px",
		},
	},
} satisfies BuiltinThemeRecipe;
