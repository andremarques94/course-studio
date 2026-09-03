import { Badge } from "@course-studio/ui/components/badge";
import { buttonVariants } from "@course-studio/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { motion, type Variants } from "motion/react";

import { PublicHeader } from "@/components/app-shell";
import { ModeToggle } from "@/features/appearance";
import { getSession } from "@/features/auth/session";

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
	loader: async () => Boolean(await getSession()),
	component: Home,
});

function Home() {
	const isAuthenticated = Route.useLoaderData();

	return (
		<div className={styles.page}>
			<PublicHeader>
				<Badge variant="outline" className={styles.preAlphaBadge}>
					<span className={styles.statusDot} aria-hidden="true" />
					Pre-alpha
				</Badge>
				<a
					href="https://github.com/andremarques94/course-studio"
					target="_blank"
					rel="noreferrer"
					className={styles.githubLink}
					aria-label="View Course Studio on GitHub"
				>
					<span className={styles.githubLabel}>GitHub</span>
					<ExternalLink aria-hidden="true" />
				</a>
				{isAuthenticated ? (
					<Link
						to="/studio"
						className={buttonVariants({ variant: "ghost", size: "sm" })}
					>
						Studio
					</Link>
				) : (
					<Link
						to="/sign-in"
						search={{ redirect: "/studio" }}
						className={buttonVariants({ variant: "ghost", size: "sm" })}
					>
						Sign in
					</Link>
				)}
				<span className={styles.actionDivider} aria-hidden="true" />
				<ModeToggle />
			</PublicHeader>

			<main className={styles.main}>
				<motion.section
					className={styles.hero}
					variants={heroVariants}
					initial="hidden"
					animate="visible"
				>
					<div className={styles.heroCopy}>
						<motion.h1 variants={heroItemVariants}>
							Build the lesson,
							<span className={styles.headlineAccent}>not the slide deck.</span>
						</motion.h1>
						<motion.p
							className={styles.description}
							variants={heroItemVariants}
						>
							Write structured lessons in Markdown, preview every slide as you
							work, and present from the same source.
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
								className={buttonVariants({ variant: "outline", size: "lg" })}
							>
								See the workflow
							</a>
						</motion.div>
					</div>

					<motion.ol className={styles.workflow} variants={heroItemVariants}>
						<li>
							<span>01</span>
							<div>
								<strong>Organize courses and lessons</strong>
								<small>Keep every lesson in a clear course structure.</small>
							</div>
						</li>
						<li>
							<span>02</span>
							<div>
								<strong>Write with live preview</strong>
								<small>
									Edit Markdown and see every slide update instantly.
								</small>
							</div>
						</li>
						<li>
							<span>03</span>
							<div>
								<strong>Collaborate in real time</strong>
								<small>
									Edit together with shared cursors and synced changes.
								</small>
							</div>
						</li>
					</motion.ol>
				</motion.section>

				<div className={styles.previewHeading} id="workflow">
					<p>One lesson. Two working views.</p>
					<span className={styles.previewMeta}>Live authoring workspace</span>
				</div>
				<section className={styles.productPreview}>
					<div className={styles.previewTopbar}>
						<div className={styles.previewBrand}>
							<span className={styles.miniMark} aria-hidden="true" />
							<span>lesson-01.md</span>
						</div>
						<div className={styles.previewActions}>
							<span>Draft</span>
							<strong>Present</strong>
						</div>
					</div>
					<div className={styles.previewBody}>
						<div className={styles.previewRail} aria-hidden="true">
							<span className={styles.railActive} />
							<span className={styles.railItem} />
							<span className={styles.railItem} />
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
				</section>
			</main>
		</div>
	);
}
