import type { PresentationHandle } from "@course-studio/presentation";
import { type BuiltinThemeId, getBuiltinTheme } from "@course-studio/themes";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@course-studio/ui/components/resizable";
import { useIsMobile } from "@course-studio/ui/hooks/use-mobile";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
	useDeferredValue,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";

import { AppShell, AppSidebar } from "@/components/app-shell";
import type { Course } from "@/features/courses/types";
import type { Lesson } from "@/features/lessons/types";
import { LessonAutosave } from "../../lesson-autosave";
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
	commands: StudioCommands;
};

export function Studio({ course, lesson, lessons, commands }: StudioProps) {
	const [previewFocused, setPreviewFocused] = useState(false);
	const presentationRef = useRef<PresentationHandle | null>(null);
	const saveLesson = useMutation({
		mutationFn: (draft: { markdown: string; themeId: BuiltinThemeId }) =>
			commands.updateLesson(draft),
		scope: { id: `lesson:${lesson.id}` },
	});
	const [autosave] = useState(
		() =>
			new LessonAutosave({
				initialDraft: {
					markdown: lesson.markdown,
					themeId: lesson.themeId,
				},
				save: saveLesson.mutateAsync,
			}),
	);
	const autosaveState = useSyncExternalStore(
		autosave.subscribe,
		autosave.getSnapshot,
		autosave.getSnapshot,
	);
	const { markdown, themeId } = autosaveState.draft;
	const previewMarkdown = useDeferredValue(markdown);
	const theme = getBuiltinTheme(themeId);
	const isMobile = useIsMobile();
	const slideCount = markdown.split(/\n\s*---\s*\n/).length;
	const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
	const previousLesson = lessons[lessonIndex - 1];
	const nextLesson = lessons[lessonIndex + 1];
	const togglePreview = () => setPreviewFocused((current) => !current);
	const handleMarkdownChange = (value: string) => {
		autosave.updateDraft({
			...autosave.getSnapshot().draft,
			markdown: value,
		});
	};
	const handleThemeChange = (value: BuiltinThemeId) => {
		autosave.updateDraft({
			...autosave.getSnapshot().draft,
			themeId: value,
		});
	};
	const flushBeforeNavigation = useEffectEvent(async () => {
		if (!autosave.getSnapshot().isUnsafeToLeave) {
			return false;
		}
		try {
			await autosave.flush();
			return false;
		} catch {
			return true;
		}
	});

	useEffect(() => () => autosave.dispose(), [autosave]);
	useBlocker({
		shouldBlockFn: flushBeforeNavigation,
		enableBeforeUnload: autosaveState.isUnsafeToLeave,
	});

	useHotkey("Mod+Shift+P", togglePreview, { stopPropagation: false });
	useHotkey(
		"Mod+S",
		() => {
			if (autosave.getSnapshot().canSaveNow) {
				void autosave.saveNow().catch(() => undefined);
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
					themeId={themeId}
					onThemeChange={handleThemeChange}
					onThemeSelectionComplete={() => presentationRef.current?.focus()}
					onExportPdf={() => commands.exportPresentation({ markdown, themeId })}
					onRenameLesson={async (title) => {
						await commands.updateLesson({ title });
					}}
					onSave={() => {
						void autosave.saveNow().catch(() => undefined);
					}}
					saveDisabled={!autosaveState.canSaveNow}
					saveStatus={autosaveState.status}
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
										markdown={previewMarkdown}
										theme={theme}
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
										<EditorPane
											value={markdown}
											onChange={handleMarkdownChange}
										/>
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
												markdown={previewMarkdown}
												theme={theme}
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
