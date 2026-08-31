import {
	type BuiltinThemeId,
	PRESENTATION_THEMES,
} from "@course-studio/themes";
import { Badge } from "@course-studio/ui/components/badge";
import { Button } from "@course-studio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@course-studio/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@course-studio/ui/components/dropdown-menu";
import { Input } from "@course-studio/ui/components/input";
import { toast } from "@course-studio/ui/components/sonner";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	CircleDot,
	Ellipsis,
	Maximize2,
	Minimize2,
	Palette,
	Pencil,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type SubmitEvent, useRef, useState } from "react";
import { AppHeader } from "@/components/app-shell";
import { ModeToggle } from "@/features/appearance";
import { TITLE_MAX_LENGTH, titleSchema } from "@/features/courses/schemas";
import type { Course } from "@/features/courses/types";
import type { Lesson } from "@/features/lessons/types";

import styles from "./StudioToolbar.module.css";

interface StudioToolbarProps {
	course: Course;
	lesson: Lesson;
	previousLessonId?: string;
	nextLessonId?: string;
	themeId: BuiltinThemeId;
	onThemeChange: (theme: BuiltinThemeId) => void;
	onThemeSelectionComplete: () => void;
	onExportPdf: () => void;
	onRenameLesson: (title: string) => Promise<void>;
	onSave: () => void;
	saveDisabled: boolean;
	saveStatus: "saved" | "unsaved" | "saving" | "error";
	previewFocused: boolean;
	onTogglePreview: () => void;
}

export function StudioToolbar({
	course,
	lesson,
	previousLessonId,
	nextLessonId,
	themeId,
	onThemeChange,
	onThemeSelectionComplete,
	onExportPdf,
	onRenameLesson,
	onSave,
	saveDisabled,
	saveStatus,
	previewFocused,
	onTogglePreview,
}: StudioToolbarProps) {
	const themeSelectionChanged = useRef(false);
	const [renameOpen, setRenameOpen] = useState(false);
	const [title, setTitle] = useState(lesson.title);
	const renameLesson = useMutation({
		mutationFn: async () => {
			const result = titleSchema.safeParse(title);
			if (!result.success) {
				throw new Error(result.error.issues[0]?.message ?? "Invalid title.");
			}
			await onRenameLesson(result.data);
		},
		onSuccess: () => {
			setRenameOpen(false);
			toast.success("Lesson renamed");
		},
	});
	const selectedTheme = PRESENTATION_THEMES.find((item) => item.id === themeId);
	const saveLabel = {
		saved: "Saved",
		unsaved: "Unsaved",
		saving: "Saving",
		error: "Save failed",
	}[saveStatus];
	const handleThemeChange = (value: string) => {
		const nextTheme = PRESENTATION_THEMES.find((item) => item.id === value);
		if (nextTheme) {
			themeSelectionChanged.current = true;
			onThemeChange(nextTheme.id);
		}
	};
	const handleThemeMenuOpenChangeComplete = (open: boolean) => {
		if (!open && themeSelectionChanged.current) {
			themeSelectionChanged.current = false;
			onThemeSelectionComplete();
		}
	};
	const handleRenameSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		renameLesson.mutate();
	};

	return (
		<AppHeader>
			<div className={styles.context}>
				<Link
					to="/studio/courses/$courseId"
					params={{ courseId: course.id }}
					className={styles.courseLink}
				>
					{course.title}
				</Link>
				<span className={styles.separator}>/</span>
				<span className={styles.lessonTitle}>{lesson.title}</span>
			</div>

			<div className={styles.actions}>
				<div className={styles.lessonNavigation}>
					{previousLessonId ? (
						<Link
							to="/studio/courses/$courseId/lessons/$lessonId"
							params={{ courseId: course.id, lessonId: previousLessonId }}
							className={styles.navigationButton}
							aria-label="Previous lesson"
						>
							<ArrowLeft />
						</Link>
					) : (
						<span
							className={styles.navigationButton}
							aria-hidden="true"
							data-disabled
						>
							<ArrowLeft />
						</span>
					)}
					{nextLessonId ? (
						<Link
							to="/studio/courses/$courseId/lessons/$lessonId"
							params={{ courseId: course.id, lessonId: nextLessonId }}
							className={styles.navigationButton}
							aria-label="Next lesson"
						>
							<ArrowRight />
						</Link>
					) : (
						<span
							className={styles.navigationButton}
							aria-hidden="true"
							data-disabled
						>
							<ArrowRight />
						</span>
					)}
				</div>
				<Badge
					variant={saveStatus === "error" ? "destructive" : "outline"}
					className={styles.badge}
				>
					<CircleDot data-icon="inline-start" />
					{saveLabel}
				</Badge>
				<Button variant="outline" onClick={onSave} disabled={saveDisabled}>
					Save
				</Button>
				<DropdownMenu onOpenChangeComplete={handleThemeMenuOpenChangeComplete}>
					<DropdownMenuTrigger
						render={
							<Button
								variant="outline"
								className={styles.themeTrigger}
								aria-label={`Presentation theme: ${selectedTheme?.name ?? themeId}`}
							/>
						}
					>
						<Palette data-icon="inline-start" />
						<span className={styles.themeLabel}>
							{selectedTheme?.name ?? themeId}
						</span>
						<ChevronDown className={styles.chevron} />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuRadioGroup
							value={themeId}
							onValueChange={handleThemeChange}
						>
							<DropdownMenuLabel>Theme</DropdownMenuLabel>
							{PRESENTATION_THEMES.map((item) => (
								<DropdownMenuRadioItem
									key={item.id}
									value={item.id}
									closeOnClick
								>
									{item.name}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
				<ModeToggle />
				<Button
					variant={previewFocused ? "secondary" : "default"}
					size="lg"
					onClick={onTogglePreview}
					aria-pressed={previewFocused}
				>
					<AnimatePresence initial={false} mode="wait">
						<motion.span
							key={previewFocused ? "exit" : "present"}
							className={styles.presentContent}
							initial={{ opacity: 0, y: 3 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -3 }}
							transition={{ duration: 0.12 }}
						>
							{previewFocused ? (
								<Minimize2 data-icon="inline-start" />
							) : (
								<Maximize2 data-icon="inline-start" />
							)}
							<span className={styles.presentLabel}>
								{previewFocused ? "Exit preview" : "Present"}
							</span>
						</motion.span>
					</AnimatePresence>
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button variant="ghost" size="icon" aria-label="More actions" />
						}
					>
						<Ellipsis />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() => {
								setTitle(lesson.title);
								renameLesson.reset();
								setRenameOpen(true);
							}}
						>
							<Pencil />
							Rename lesson
						</DropdownMenuItem>
						<DropdownMenuItem disabled>Duplicate lesson</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onExportPdf}>
							Export PDF
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Dialog
					open={renameOpen}
					onOpenChange={(open) => {
						if (!renameLesson.isPending) {
							setRenameOpen(open);
						}
					}}
				>
					<DialogContent>
						<form className={styles.renameForm} onSubmit={handleRenameSubmit}>
							<DialogHeader>
								<DialogTitle>Rename lesson</DialogTitle>
								<DialogDescription>
									Choose a concise title for this lesson.
								</DialogDescription>
							</DialogHeader>
							<div className={styles.renameField}>
								<label htmlFor="studio-lesson-title">Lesson name</label>
								<Input
									id="studio-lesson-title"
									value={title}
									onChange={(event) => {
										setTitle(event.target.value);
										renameLesson.reset();
									}}
									maxLength={TITLE_MAX_LENGTH}
									autoComplete="off"
									autoFocus
								/>
								{renameLesson.error ? (
									<p className={styles.renameError} role="alert">
										{renameLesson.error.message}
									</p>
								) : null}
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setRenameOpen(false)}
									disabled={renameLesson.isPending}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={
										!titleSchema.safeParse(title).success ||
										renameLesson.isPending
									}
								>
									{renameLesson.isPending ? "Saving..." : "Save"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>
		</AppHeader>
	);
}
