import type { PresentationHandle } from "@course-studio/presentation";
import { type BuiltinThemeId, getBuiltinTheme } from "@course-studio/themes";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@course-studio/ui/components/resizable";
import { useIsMobile } from "@course-studio/ui/hooks/use-mobile";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useDeferredValue, useRef, useState } from "react";

import { AppShell, AppSidebar } from "@/components/app-shell";
import { courseRepository } from "@/features/courses/repository";
import type { Course } from "@/features/courses/types";
import { lessonQueries } from "@/features/lessons/queries";
import type { Lesson } from "@/features/lessons/types";
import { openPdfExport } from "../../export-pdf";
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

interface StudioProps {
	course: Course;
	lesson: Lesson;
	lessons: Lesson[];
}

export function Studio({ course, lesson, lessons }: StudioProps) {
	const [markdown, setMarkdown] = useState(lesson.markdown);
	const [themeId, setThemeId] = useState<BuiltinThemeId>(lesson.themeId);
	const [savedMarkdown, setSavedMarkdown] = useState(lesson.markdown);
	const [savedThemeId, setSavedThemeId] = useState<BuiltinThemeId>(
		lesson.themeId,
	);
	const [previewFocused, setPreviewFocused] = useState(false);
	const presentationRef = useRef<PresentationHandle | null>(null);
	const queryClient = useQueryClient();
	const previewMarkdown = useDeferredValue(markdown);
	const theme = getBuiltinTheme(themeId);
	const isMobile = useIsMobile();
	const slideCount = markdown.split(/\n\s*---\s*\n/).length;
	const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
	const previousLesson = lessons[lessonIndex - 1];
	const nextLesson = lessons[lessonIndex + 1];
	const isDirty = markdown !== savedMarkdown || themeId !== savedThemeId;
	const togglePreview = () => setPreviewFocused((current) => !current);
	const saveLesson = useMutation({
		mutationFn: () =>
			courseRepository.updateLesson(lesson.id, { markdown, themeId }),
		onSuccess: (updatedLesson) => {
			queryClient.setQueryData(
				lessonQueries.detail(lesson.id).queryKey,
				updatedLesson,
			);
			queryClient.setQueryData<Lesson[]>(
				["courses", course.id, "lessons"],
				(current) =>
					current?.map((item) =>
						item.id === updatedLesson.id ? updatedLesson : item,
					),
			);
			setSavedMarkdown(updatedLesson.markdown);
			setSavedThemeId(updatedLesson.themeId);
		},
	});
	const handleMarkdownChange = (value: string) => {
		saveLesson.reset();
		setMarkdown(value);
	};
	const handleThemeChange = (value: BuiltinThemeId) => {
		saveLesson.reset();
		setThemeId(value);
	};
	const saveStatus = saveLesson.isError
		? "error"
		: saveLesson.isPending
			? "saving"
			: isDirty
				? "unsaved"
				: "saved";

	useHotkey("Mod+Shift+P", togglePreview, { stopPropagation: false });

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
					onExportPdf={() => openPdfExport({ markdown, themeId })}
					onSave={() => saveLesson.mutate()}
					saveDisabled={!isDirty || saveLesson.isPending}
					saveStatus={saveStatus}
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
								className={styles.mode}
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
