export const BUILTIN_THEME_IDS = ["minimal", "academic", "dark"] as const;
export type BuiltinThemeId = (typeof BUILTIN_THEME_IDS)[number];

export function isBuiltinThemeId(value: unknown): value is BuiltinThemeId {
	return BUILTIN_THEME_IDS.some((id) => id === value);
}
