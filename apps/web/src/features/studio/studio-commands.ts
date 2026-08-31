import type { BuiltinThemeId } from "@course-studio/themes";

export interface StudioCommands {
	updateLesson(input: {
		title?: string;
		markdown?: string;
		themeId?: BuiltinThemeId;
	}): Promise<{
		markdown: string;
		themeId: BuiltinThemeId;
	}>;
	exportPresentation(input: {
		markdown: string;
		themeId: BuiltinThemeId;
	}): void;
}
