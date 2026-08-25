import { createFileRoute } from "@tanstack/react-router";

import styles from "./index.module.css";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className={styles.home}>
			<h1 className={styles.title}>Welcome to TanStack Start</h1>
			<p className={styles.description}>
				Edit <code>src/routes/index.tsx</code> to get started.
			</p>
		</div>
	);
}
