import type { ReactNode } from "react";

import styles from "./AppShell.module.css";

interface AppShellProps {
	header: ReactNode;
	sidebar: ReactNode;
	statusBar: ReactNode;
	children: ReactNode;
}

export function AppShell({
	header,
	sidebar,
	statusBar,
	children,
}: AppShellProps) {
	return (
		<div className={styles.shell}>
			{header}
			<div className={styles.body}>
				{sidebar}
				<div className={styles.workspace}>{children}</div>
			</div>
			{statusBar}
		</div>
	);
}
