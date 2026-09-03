import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@course-studio/ui/components/tooltip";
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { Files, House, LogOut, Search } from "lucide-react";
import { motion } from "motion/react";
import type { ReactElement } from "react";
import { authClient } from "@/features/auth/auth-client";

import styles from "./AppSidebar.module.css";

type RailTooltipProps = {
	label: string;
	children: ReactElement;
};

function RailTooltip({ label, children }: RailTooltipProps) {
	return (
		<Tooltip>
			<TooltipTrigger render={children} />
			<TooltipContent side="right" sideOffset={8}>
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

export function AppSidebar() {
	const { user } = useRouteContext({ from: "/studio" });
	const navigate = useNavigate();
	const initials = user.name
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	async function signOut() {
		await authClient.signOut();
		await navigate({ to: "/sign-in", search: { redirect: "/studio" } });
	}

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

			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<button
							type="button"
							className={styles.accountButton}
							aria-label={`Account menu for ${user.name}`}
						/>
					}
				>
					<Avatar size="sm">
						{user.image && <AvatarImage src={user.image} alt="" />}
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="right" align="end">
					<DropdownMenuGroup>
						<DropdownMenuLabel>{user.email}</DropdownMenuLabel>
						<DropdownMenuItem onClick={signOut}>
							<LogOut />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</aside>
	);
}

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@course-studio/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@course-studio/ui/components/dropdown-menu";
