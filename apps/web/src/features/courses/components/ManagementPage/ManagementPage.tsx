import type { ReactNode } from "react";
import { AppHeader, AppShell, AppSidebar } from "@/components/app-shell";
import { ModeToggle } from "@/features/appearance";
import styles from "./ManagementPage.module.css";

type ManagementPageProps = {
	title: string;
	children: ReactNode;
};

export function ManagementPage({ title, children }: ManagementPageProps) {
	return (
		<AppShell
			header={
				<AppHeader>
					<div className={styles.headerTitle}>{title}</div>
					<ModeToggle />
				</AppHeader>
			}
			sidebar={<AppSidebar />}
			statusBar={null}
		>
			<main className={styles.main}>{children}</main>
		</AppShell>
	);
}
