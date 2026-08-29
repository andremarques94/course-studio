import type { PresentationHandle } from "@course-studio/presentation";
import { type BuiltinThemeId, getBuiltinTheme } from "@course-studio/themes";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@course-studio/ui/components/resizable";
import { useIsMobile } from "@course-studio/ui/hooks/use-mobile";
import { useHotkey } from "@tanstack/react-hotkeys";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useDeferredValue, useRef, useState } from "react";

import { AppShell, AppSidebar } from "@/components/app-shell";
import { openPdfExport } from "../../export-pdf";
import { INITIAL_MARKDOWN } from "../../initial-markdown";
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

export function Studio() {
	const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
	const [themeId, setThemeId] = useState<BuiltinThemeId>("minimal");
	const [previewFocused, setPreviewFocused] = useState(false);
	const presentationRef = useRef<PresentationHandle | null>(null);
	const previewMarkdown = useDeferredValue(markdown);
	const theme = getBuiltinTheme(themeId);
	const isMobile = useIsMobile();
	const slideCount = markdown.split(/\n\s*---\s*\n/).length;
	const togglePreview = () => setPreviewFocused((current) => !current);

	useHotkey("Mod+Shift+P", togglePreview, { stopPropagation: false });

	return (
		<AppShell
			header={
				<StudioToolbar
					themeId={themeId}
					onThemeChange={setThemeId}
					onThemeSelectionComplete={() => presentationRef.current?.focus()}
					onExportPdf={() => openPdfExport({ markdown, themeId })}
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
										<EditorPane value={markdown} onChange={setMarkdown} />
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
