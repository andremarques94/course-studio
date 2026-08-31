import type { Lesson } from "@/features/lessons/types";
import type { Course } from "../types";

const seededAt = new Date("2026-08-31T09:00:00.000Z");

export const MOCK_COURSES: Course[] = [
	{
		id: "react-fundamentals",
		title: "React Fundamentals",
		slug: "react-fundamentals",
		createdAt: seededAt,
		updatedAt: seededAt,
	},
];

export const MOCK_LESSONS: Lesson[] = [
	{
		id: "react-introduction",
		courseId: "react-fundamentals",
		title: "Introduction",
		slug: "introduction",
		markdown: `# React Fundamentals

Introduction to React.

---

## What is React?

React is a library for building user interfaces.`,
		themeId: "minimal",
		position: 0,
		createdAt: seededAt,
		updatedAt: seededAt,
	},
	{
		id: "react-components",
		courseId: "react-fundamentals",
		title: "Components",
		slug: "components",
		markdown: `# Components

Build interfaces from small, reusable pieces.

---

## A first component

\`\`\`tsx
function Welcome() {
  return <h1>Hello!</h1>
}
\`\`\``,
		themeId: "academic",
		position: 1,
		createdAt: seededAt,
		updatedAt: seededAt,
	},
	{
		id: "react-state",
		courseId: "react-fundamentals",
		title: "State",
		slug: "state",
		markdown: `# State

State lets a component remember information.

---

## Updating state

Use a state setter to request another render.`,
		themeId: "dark",
		position: 2,
		createdAt: seededAt,
		updatedAt: seededAt,
	},
];
