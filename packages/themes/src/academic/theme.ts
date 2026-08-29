import { BODY_SANS, BODY_SERIF, CODE_MONO } from "../theme-fonts";
import type { BuiltinThemeRecipe } from "../theme-types";

export const academicThemeRecipe = {
	name: "Academic",
	tokens: {
		colors: {
			background: "#fbfaf7",
			foreground: "#2b3035",
			heading: "#172c42",
			accent: "#315f88",
			accentHover: "#204463",
			muted: "#69737c",
			selectionBackground: "#cbddeb",
			selectionForeground: "#172c42",
			inlineCodeBackground: "#eceff1",
		},
		typography: {
			bodyFamily: BODY_SANS,
			headingFamily: BODY_SERIF,
			codeFamily: CODE_MONO,
			bodySize: "42px",
			headingWeight: 500,
			headingLetterSpacing: "-0.02em",
			heading1Size: "2.45em",
			heading2Size: "1.62em",
			heading3Size: "1.18em",
		},
		spacing: {
			slidePadding: "122px 152px 108px",
		},
	},
} satisfies BuiltinThemeRecipe;
