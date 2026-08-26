import { Badge } from "@course-studio/ui/components/badge";
import { buttonVariants } from "@course-studio/ui/components/button";
import { Separator } from "@course-studio/ui/components/separator";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import {
	motion,
	useReducedMotion,
	useScroll,
	useTransform,
	type Variants,
} from "motion/react";
import { useRef } from "react";

import { ProductBrand } from "@/components/app-shell";
import { ModeToggle } from "@/features/appearance";

import styles from "./index.module.css";

const heroVariants = {
	hidden: {},
	visible: {
		transition: {
			delayChildren: 0.08,
			staggerChildren: 0.08,
		},
	},
} satisfies Variants;

const heroItemVariants = {
	hidden: { opacity: 0, y: 24 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { type: "spring", stiffness: 305, damping: 33 },
	},
} satisfies Variants;

export const Route = createFileRoute("/(public)/")({
	head: () => ({
		meta: [{ title: "Course Studio | Markdown to courses" }],
	}),
	component: Home,
});

function Home() {
	const previewRef = useRef<HTMLElement>(null);
	const reducedMotion = useReducedMotion();
	const { scrollYProgress } = useScroll({
		target: previewRef,
		offset: ["start end", "end start"],
	});
	const previewY = useTransform(scrollYProgress, [0, 1], [18, -18]);

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<ProductBrand />
				<div className={styles.headerActions}>
					<Badge variant="outline" className={styles.preAlphaBadge}>
						Pre-alpha
					</Badge>
					<a
						href="https://github.com/andremarques94/course-studio"
						target="_blank"
						rel="noreferrer"
						className={styles.githubLink}
					>
						GitHub
						<ExternalLink aria-hidden="true" />
					</a>
					<ModeToggle />
				</div>
			</header>

			<Separator />

			<main className={styles.main}>
				<motion.section
					className={styles.hero}
					variants={heroVariants}
					initial="hidden"
					animate="visible"
				>
					<motion.h1 variants={heroItemVariants}>
						Build the lesson, not the slide deck.
					</motion.h1>
					<motion.p className={styles.description} variants={heroItemVariants}>
						Turn your Markdown notes into beautiful presentations.
					</motion.p>

					<motion.div
						className={styles.heroActions}
						variants={heroItemVariants}
					>
						<Link
							to="/studio"
							preload="intent"
							className={buttonVariants({ size: "lg" })}
						>
							Open Studio
							<ArrowRight data-icon="inline-end" />
						</Link>
						<a
							href="#workflow"
							aria-label="See how it works"
							className={buttonVariants({ variant: "outline", size: "lg" })}
						>
							See how it works
						</a>
					</motion.div>
				</motion.section>

				<motion.section
					ref={previewRef}
					className={styles.productPreview}
					id="workflow"
					style={{ y: reducedMotion ? 0 : previewY }}
					initial={{ opacity: 0, scale: 0.985 }}
					whileInView={{ opacity: 1, scale: 1 }}
					viewport={{ once: true, amount: 0.18 }}
					transition={{ type: "spring", stiffness: 305, damping: 33 }}
				>
					<div className={styles.previewTopbar}>
						<div className={styles.previewBrand}>
							<span className={styles.miniMark} aria-hidden="true" />
							<span>Introducing Course Studio</span>
						</div>
						<div className={styles.previewActions}>
							<span>Draft</span>
							<strong>Present</strong>
						</div>
					</div>
					<div className={styles.previewBody}>
						<div className={styles.previewRail} aria-hidden="true">
							<span className={styles.railActive} />
							<span />
							<span />
						</div>
						<div className={styles.editorMock}>
							<div className={styles.paneLabel}>Editor</div>
							<div className={styles.codeLines}>
								<span className={styles.heading}># Course Studio</span>
								<span>Turn Markdown notes into presentations.</span>
								<span className={styles.separator}>---</span>
								<span className={styles.heading}>
									## Write. Preview. Present.
								</span>
								<span>
									Preview every slide instantly and shape course material
									without fighting presentation tools.
								</span>
							</div>
						</div>
						<div className={styles.previewMock}>
							<div className={styles.paneLabel}>Preview</div>
							<div className={styles.canvasMock}>
								<div className={styles.slideMock}>
									<span className={styles.slideKicker}>02 / 04</span>
									<strong>Write. Preview. Present.</strong>
									<p>
										Preview every slide instantly and shape course material
										without fighting presentation tools.
									</p>
								</div>
							</div>
						</div>
					</div>
					<div className={styles.previewStatus}>
						<span>Markdown</span>
						<span>2 slides</span>
						<span>16:9</span>
					</div>
				</motion.section>
			</main>
		</div>
	);
}
