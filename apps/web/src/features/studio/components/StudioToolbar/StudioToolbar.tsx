import { Badge } from "@course-studio/ui/components/badge";
import { Button } from "@course-studio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@course-studio/ui/components/dropdown-menu";
import { CircleDot, Ellipsis, Maximize2, Minimize2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AppHeader } from "@/components/app-shell";
import { ModeToggle } from "@/features/appearance";

import styles from "./StudioToolbar.module.css";

interface StudioToolbarProps {
	previewFocused: boolean;
	onTogglePreview: () => void;
}

export function StudioToolbar({
	previewFocused,
	onTogglePreview,
}: StudioToolbarProps) {
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
						<DropdownMenuItem disabled>Export PDF</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</AppHeader>
	);
}
