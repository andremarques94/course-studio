import type { ReactNode } from "react";

import { ProductBrand } from "../ProductBrand/ProductBrand";
import styles from "./PublicHeader.module.css";

type PublicHeaderProps = {
	children: ReactNode;
};

export function PublicHeader({ children }: PublicHeaderProps) {
	return (
		<header className={styles.header}>
			<div className={styles.inner}>
				<ProductBrand />
				<nav className={styles.actions} aria-label="Public navigation">
					{children}
				</nav>
			</div>
		</header>
	);
}
