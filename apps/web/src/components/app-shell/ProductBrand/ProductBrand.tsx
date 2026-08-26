import { Link } from "@tanstack/react-router";

import styles from "./ProductBrand.module.css";

export function ProductBrand() {
	return (
		<Link to="/" className={styles.brand} aria-label="Course Studio home">
			<span className={styles.mark} aria-hidden="true">
				<span />
			</span>
			<span className={styles.name}>Course Studio</span>
		</Link>
	);
}
