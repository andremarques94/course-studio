import type { BuiltinThemeId } from "@course-studio/themes";

export type StudioCommands = {
	renameLesson(title: string): Promise<void>;
	exportPresentation(input: {
		markdown: string;
		themeId: BuiltinThemeId;
	}): void;
};
