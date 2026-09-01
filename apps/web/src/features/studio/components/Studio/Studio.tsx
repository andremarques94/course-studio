import type { PresentationHandle } from "@course-studio/presentation";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@course-studio/ui/components/resizable";
import { useIsMobile } from "@course-studio/ui/hooks/use-mobile";
import { useHotkey } from "@tanstack/react-hotkeys";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useRef, useState } from "react";

import { AppShell, AppSidebar } from "@/components/app-shell";
import type { Course } from "@/features/courses/types";
import type { Lesson } from "@/features/lessons/types";
import type { LessonDocument } from "../../document";
import type { StudioDraft } from "../../draft";
import type { StudioCommands } from "../../studio-commands";
import { EditorPane } from "../EditorPane";
import { PreviewPane } from "../PreviewPane";
import { StudioStatusBar } from "../StudioStatusBar";
import { StudioToolbar } from "../StudioToolbar";
import styles from "./Studio.module.css";

const previewTransition = {
	type: "spring",
	stiffness: 305,
	damping: 33,
} as const;

type StudioProps = {
	course: Course;
	lesson: Lesson;
	lessons: Lesson[];
	lessonDocument: LessonDocument;
	draft: StudioDraft;
	commands: StudioCommands;
};

export function Studio({
	course,
	lesson,
	lessons,
	lessonDocument,
	draft,
	commands,
}: StudioProps) {
	const [previewFocused, setPreviewFocused] = useState(false);
	const presentationRef = useRef<PresentationHandle | null>(null);
	const isMobile = useIsMobile();
	const slideCount = draft.markdown.split(/\n\s*---\s*\n/).length;
	const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
	const previousLesson = lessons[lessonIndex - 1];
	const nextLesson = lessons[lessonIndex + 1];
	const togglePreview = () => setPreviewFocused((current) => !current);

	useHotkey("Mod+Shift+P", togglePreview, { stopPropagation: false });
	useHotkey(
		"Mod+S",
		() => {
			if (draft.canSaveNow) {
				void draft.saveNow().catch(() => undefined);
			}
		},
		{ preventDefault: true, stopPropagation: false },
	);
	useHotkey("Escape", () => setPreviewFocused(false), {
		enabled: previewFocused,
		preventDefault: true,
		stopPropagation: true,
	});

	return (
		<AppShell
			header={
				<StudioToolbar
					course={course}
					lesson={lesson}
					previousLessonId={previousLesson?.id}
					nextLessonId={nextLesson?.id}
					themeId={draft.themeId}
					onThemeChange={draft.setThemeId}
					onThemeSelectionComplete={() => presentationRef.current?.focus()}
					onExportPdf={() =>
						commands.exportPresentation({
							markdown: draft.markdown,
							themeId: draft.themeId,
						})
					}
					onRenameLesson={async (title) => {
						await commands.updateLesson({ title });
					}}
					onSave={() => {
						void draft.saveNow().catch(() => undefined);
					}}
					saveDisabled={!draft.canSaveNow}
					saveStatus={draft.saveStatus}
					previewFocused={previewFocused}
					onTogglePreview={togglePreview}
				/>
			}
			sidebar={<AppSidebar />}
			statusBar={<StudioStatusBar slideCount={slideCount} />}
		>
			<LayoutGroup id="studio-preview">
				<main className={styles.workspace}>
					<AnimatePresence initial={false}>
						{previewFocused ? (
							<motion.div
								key="focused-preview"
								className={`${styles.mode} ${styles.focusedMode}`}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.14 }}
							>
								<motion.div
									layoutId="presentation-preview"
									className={styles.previewLayout}
									transition={previewTransition}
								>
									<PreviewPane
										markdown={draft.previewMarkdown}
										theme={draft.theme}
										presentationRef={presentationRef}
										focused
									/>
								</motion.div>
							</motion.div>
						) : (
							<motion.div
								key="split-workspace"
								className={styles.mode}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.14 }}
							>
								<ResizablePanelGroup
									orientation={isMobile ? "vertical" : "horizontal"}
									className={styles.panelGroup}
								>
									<ResizablePanel
										defaultSize={isMobile ? "54%" : "45%"}
										minSize="28%"
									>
										<EditorPane markdown={lessonDocument.markdown} />
									</ResizablePanel>
									<ResizableHandle className={styles.resizeHandle} withHandle />
									<ResizablePanel
										defaultSize={isMobile ? "46%" : "55%"}
										minSize="28%"
									>
										<motion.div
											layoutId="presentation-preview"
											className={styles.previewLayout}
											transition={previewTransition}
										>
											<PreviewPane
												markdown={draft.previewMarkdown}
												theme={draft.theme}
												presentationRef={presentationRef}
											/>
										</motion.div>
									</ResizablePanel>
								</ResizablePanelGroup>
							</motion.div>
						)}
					</AnimatePresence>
				</main>
			</LayoutGroup>
		</AppShell>
	);
}
