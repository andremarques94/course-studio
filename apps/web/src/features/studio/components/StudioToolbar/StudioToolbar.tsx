import styles from "./StudioToolbar.module.css";

export function StudioToolbar() {
	return (
		<header className={styles.studioToolbar}>
			<strong>Course Studio</strong>

			<div>
				<button type="button">Fullscreen</button>
			</div>
		</header>
	);
}
