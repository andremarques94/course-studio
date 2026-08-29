export type ThemeColors = {
	background: string;
	foreground: string;
	heading: string;
	accent: string;
	accentHover: string;
	muted: string;
	selectionBackground: string;
	selectionForeground: string;
	inlineCodeBackground: string;
};

export type ThemeTypography = {
	bodyFamily: string;
	headingFamily: string;
	codeFamily: string;
	bodySize: string;
	headingWeight: number;
	headingLetterSpacing: string;
	heading1Size: string;
	heading2Size: string;
	heading3Size: string;
};

export type ThemeSpacing = {
	slidePadding: string;
};

export type ThemeTokens = {
	colors: ThemeColors;
	typography: ThemeTypography;
	spacing: ThemeSpacing;
};

export type BuiltinThemeRecipe = {
	name: string;
	tokens: ThemeTokens;
};
