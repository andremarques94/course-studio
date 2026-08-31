import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@course-studio/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import { Files, House, Search, Settings } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import styles from "./AppSidebar.module.css";

type RailTooltipProps = {
	label: string;
	children: ReactNode;
};

function RailTooltip({ label, children }: RailTooltipProps) {
	return (
		<Tooltip>
			<TooltipTrigger render={<span className={styles.tooltipTrigger} />}>
				{children}
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}

export function AppSidebar() {
	return (
		<aside className={styles.sidebar} aria-label="Studio navigation">
			<nav className={styles.primaryNavigation}>
				<RailTooltip label="Home">
					<Link to="/" className={styles.railButton} aria-label="Home">
						<House />
					</Link>
				</RailTooltip>

				<RailTooltip label="Studio">
					<Link
						to="/studio"
						className={`${styles.railButton} ${styles.active}`}
						aria-label="Studio"
						aria-current="page"
					>
						<motion.span
							layoutId="studio-navigation-active"
							className={styles.activeIndicator}
							transition={{ type: "spring", stiffness: 305, damping: 33 }}
							aria-hidden="true"
						/>
						<Files />
					</Link>
				</RailTooltip>

				<RailTooltip label="Search (coming later)">
					<button
						type="button"
						className={styles.railButton}
						aria-label="Search (coming later)"
						disabled
					>
						<Search />
					</button>
				</RailTooltip>
			</nav>

			<RailTooltip label="Settings (coming later)">
				<button
					type="button"
					className={styles.railButton}
					aria-label="Settings (coming later)"
					disabled
				>
					<Settings />
				</button>
			</RailTooltip>
		</aside>
	);
}
