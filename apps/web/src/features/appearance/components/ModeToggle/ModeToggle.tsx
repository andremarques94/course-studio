import { Button } from "@course-studio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@course-studio/ui/components/dropdown-menu";
import { cn } from "@course-studio/ui/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../ThemeProvider";
import styles from "./ModeToggle.module.css";

export function ModeToggle() {
	const { setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						size="icon"
						className={styles.toggle}
						aria-label="Choose color theme"
					/>
				}
			>
				<Sun className={cn(styles.icon, styles.sun)} />
				<Moon className={cn(styles.icon, styles.moon)} />
				<span className={styles.srOnly}>Choose color theme</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => setTheme("light")}>
					Light
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")}>
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("system")}>
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
