import { Presentation } from "@course-studio/presentation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dev/presentation")({
	component: PresentationDemo,
});

const markdown = `
# Course Studio

Markdown-powered presentations.

---

## Why?

I want to create courses without manually building slides.

---

## Markdown

# One

---

# Two

---

# Three

---

## Code

\`\`\`ts
// did it re-render?
const sum = (a: number, b: number) => a + b
\`\`\`

---

# It works 🎉

[Open TanStack](https://tanstack.com)

`;

function PresentationDemo() {
	return (
		<main
			style={{
				width: "100vw",
				height: "100vh",
			}}
		>
			<Presentation markdown={markdown} />
		</main>
	);
}
