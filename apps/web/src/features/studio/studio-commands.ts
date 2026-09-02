import type { BuiltinThemeId } from "@course-studio/themes";

export type StudioCommands = {
	updateLesson(input: {
		title?: string;
		themeId?: BuiltinThemeId;
	}): Promise<void>;
	exportPresentation(input: {
		markdown: string;
		themeId: BuiltinThemeId;
	}): void;
};
