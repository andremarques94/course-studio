import type { PresentationTheme } from "@course-studio/themes";
import type { CSSProperties } from "react";

type ThemeStyle = CSSProperties & Record<`--presentation-${string}`, string>;

export function getThemeStyle(theme: PresentationTheme): ThemeStyle {
	const { colors, spacing, typography } = theme.tokens;

	return {
		"--presentation-background": colors.background,
		"--presentation-foreground": colors.foreground,
		"--presentation-heading": colors.heading,
		"--presentation-accent": colors.accent,
		"--presentation-accent-hover": colors.accentHover,
		"--presentation-muted": colors.muted,
		"--presentation-selection-background": colors.selectionBackground,
		"--presentation-selection-foreground": colors.selectionForeground,
		"--presentation-inline-code-background": colors.inlineCodeBackground,
		"--presentation-body-font": typography.bodyFamily,
		"--presentation-heading-font": typography.headingFamily,
		"--presentation-code-font": typography.codeFamily,
		"--presentation-body-size": typography.bodySize,
		"--presentation-heading-weight": String(typography.headingWeight),
		"--presentation-heading-letter-spacing": typography.headingLetterSpacing,
		"--presentation-heading-1-size": typography.heading1Size,
		"--presentation-heading-2-size": typography.heading2Size,
		"--presentation-heading-3-size": typography.heading3Size,
		"--presentation-slide-padding": spacing.slidePadding,
	};
}
