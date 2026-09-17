import { mapValues } from "remeda";
import { academicThemeRecipe } from "./academic/theme";
import { darkThemeRecipe } from "./dark/theme";
import type { BuiltinThemeId } from "./ids";
import { minimalThemeRecipe } from "./minimal/theme";
import type { ThemeTokens } from "./theme-types";

const BUILTIN_THEME_RECIPES = {
	minimal: minimalThemeRecipe,
	academic: academicThemeRecipe,
	dark: darkThemeRecipe,
} satisfies Record<BuiltinThemeId, { name: string; tokens: ThemeTokens }>;

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

const presentationThemeById = mapValues(
	BUILTIN_THEME_RECIPES,
	(recipe, id) => ({
		id,
		baseThemeId: id,
		...recipe,
	}),
);

export const PRESENTATION_THEMES: readonly BuiltinPresentationTheme[] =
	Object.values(presentationThemeById);

export function getBuiltinTheme(id: BuiltinThemeId): BuiltinPresentationTheme {
	return presentationThemeById[id];
}
