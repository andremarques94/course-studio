import { Skeleton } from "@course-studio/ui/components/skeleton";
import { AppHeader, AppShell } from "@/components/app-shell";

import styles from "./StudioLoadingState.module.css";

export function StudioLoadingState() {
	return (
		<AppShell
			header={
				<AppHeader>
					<div className={styles.header} aria-hidden="true">
						<Skeleton className={styles.lessonTitle} />
						<div className={styles.headerActions}>
							<Skeleton className={styles.statusBadge} />
							<Skeleton className={styles.action} />
							<Skeleton className={styles.actionWide} />
							<Skeleton className={styles.presentAction} />
						</div>
					</div>
				</AppHeader>
			}
			sidebar={
				<aside className={styles.sidebar} aria-hidden="true">
					<Skeleton className={styles.sidebarAction} />
					<Skeleton className={styles.sidebarAction} />
					<Skeleton className={styles.sidebarAction} />
				</aside>
			}
			statusBar={
				<footer className={styles.statusBar} aria-hidden="true">
					<Skeleton className={styles.statusItem} />
					<Skeleton className={styles.statusItem} />
					<Skeleton className={styles.statusItemShort} />
				</footer>
			}
		>
			<main className={styles.workspace} aria-busy="true" aria-live="polite">
				<span className={styles.srOnly}>Preparing collaborative editor…</span>
				<section className={styles.editor} aria-hidden="true">
					<Skeleton className={styles.paneLabel} />
					<div className={styles.editorLines}>
						<Skeleton className={styles.lineHeading} />
						<Skeleton className={styles.line} />
						<Skeleton className={styles.lineShort} />
						<Skeleton className={styles.lineHeading} />
						<Skeleton className={styles.line} />
					</div>
				</section>
				<section className={styles.preview} aria-hidden="true">
					<Skeleton className={styles.paneLabel} />
					<Skeleton className={styles.slide} />
				</section>
			</main>
		</AppShell>
	);
}
