import { academicThemeRecipe } from "./academic/theme";
import { darkThemeRecipe } from "./dark/theme";
import { minimalThemeRecipe } from "./minimal/theme";
import type { ThemeTokens } from "./theme-types";

const BUILTIN_THEME_RECIPES = {
	minimal: minimalThemeRecipe,
	academic: academicThemeRecipe,
	dark: darkThemeRecipe,
};

export type BuiltinThemeId = keyof typeof BUILTIN_THEME_RECIPES;

export type PresentationTheme = {
	id: string;
	name: string;
	baseThemeId: BuiltinThemeId;
	tokens: ThemeTokens;
};

type BuiltinPresentationTheme = PresentationTheme & {
	id: BuiltinThemeId;
	baseThemeId: BuiltinThemeId;
};

const builtinThemeIds = Object.keys(BUILTIN_THEME_RECIPES) as BuiltinThemeId[];

export const PRESENTATION_THEMES: readonly BuiltinPresentationTheme[] =
	builtinThemeIds.map((id) => ({
		id,
		baseThemeId: id,
		...BUILTIN_THEME_RECIPES[id],
	}));

const presentationThemeById = Object.fromEntries(
	PRESENTATION_THEMES.map((theme) => [theme.id, theme]),
) as Record<BuiltinThemeId, BuiltinPresentationTheme>;

export function getBuiltinTheme(id: BuiltinThemeId): BuiltinPresentationTheme {
	return presentationThemeById[id];
}

export function isBuiltinThemeId(value: unknown): value is BuiltinThemeId {
	return (
		typeof value === "string" && Object.hasOwn(BUILTIN_THEME_RECIPES, value)
	);
}
