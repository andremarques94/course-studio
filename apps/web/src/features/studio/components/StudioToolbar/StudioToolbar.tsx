import {
	type BuiltinThemeId,
	PRESENTATION_THEMES,
} from "@course-studio/themes";
import { Badge } from "@course-studio/ui/components/badge";
import { Button } from "@course-studio/ui/components/button";
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
import {
	ChevronDown,
	CircleDot,
	Ellipsis,
	Maximize2,
	Minimize2,
	Palette,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { AppHeader } from "@/components/app-shell";
import { ModeToggle } from "@/features/appearance";

import styles from "./StudioToolbar.module.css";

interface StudioToolbarProps {
	themeId: BuiltinThemeId;
	onThemeChange: (theme: BuiltinThemeId) => void;
	onThemeSelectionComplete: () => void;
	onExportPdf: () => void;
	previewFocused: boolean;
	onTogglePreview: () => void;
}

export function StudioToolbar({
	themeId,
	onThemeChange,
	onThemeSelectionComplete,
	onExportPdf,
	previewFocused,
	onTogglePreview,
}: StudioToolbarProps) {
	const themeSelectionChanged = useRef(false);
	const selectedTheme = PRESENTATION_THEMES.find((item) => item.id === themeId);
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

	return (
		<AppHeader>
			<div className={styles.context}>
				<span className={styles.lessonTitle}>Untitled lesson</span>
				<span className={styles.localLabel}>Local workspace</span>
			</div>

			<div className={styles.actions}>
				<Badge variant="outline" className={styles.badge}>
					<CircleDot data-icon="inline-start" />
					Draft
				</Badge>
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
						<DropdownMenuItem disabled>Rename lesson</DropdownMenuItem>
						<DropdownMenuItem disabled>Duplicate lesson</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onExportPdf}>
							Export PDF
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</AppHeader>
	);
}
