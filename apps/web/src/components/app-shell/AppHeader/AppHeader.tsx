import type { ReactNode } from "react";

import { ProductBrand } from "../ProductBrand/ProductBrand";
import styles from "./AppHeader.module.css";

interface AppHeaderProps {
	children: ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
	return (
		<header className={styles.header}>
			<ProductBrand />
			<div className={styles.divider} aria-hidden="true" />
			{children}
		</header>
	);
}
