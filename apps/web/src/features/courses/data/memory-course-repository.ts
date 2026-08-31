import { omitBy } from "remeda";
import {
	lessonsSchema,
	updateLessonInputSchema,
} from "@/features/lessons/schemas";
import type { Lesson } from "@/features/lessons/types";
import type {
	CourseRepository,
	CreateCourseInput,
	CreateLessonInput,
	UpdateLessonInput,
} from "../course-repository";
import { coursesSchema, createTitleInputSchema } from "../schemas";
import type { Course } from "../types";
import { MOCK_COURSES, MOCK_LESSONS } from "./mock-data";

const courses = coursesSchema.parse(MOCK_COURSES).map(copyCourse);
const lessons = lessonsSchema.parse(MOCK_LESSONS).map(copyLesson);

function copyCourse(course: Course): Course {
	return { ...course };
}

function copyLesson(lesson: Lesson): Lesson {
	return { ...lesson };
}

function slugify(value: string): string {
	return (
		value
			.normalize("NFKD")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "untitled"
	);
}

function uniqueValue(base: string, existing: readonly string[]): string {
	if (!existing.includes(base)) {
		return base;
	}

	let suffix = 2;
	while (existing.includes(`${base}-${suffix}`)) {
		suffix += 1;
	}
	return `${base}-${suffix}`;
}

export const memoryCourseRepository: CourseRepository = {
	async getCourses() {
		return courses.map(copyCourse);
	},

	async getCourse(id) {
		const course = courses.find((item) => item.id === id);
		return course ? copyCourse(course) : undefined;
	},

	async createCourse(input: CreateCourseInput) {
		const { title } = createTitleInputSchema.parse(input);
		const slug = uniqueValue(
			slugify(title),
			courses.map((course) => course.slug),
		);
		const now = new Date();
		const course: Course = {
			id: slug,
			title,
			slug,
			createdAt: now,
			updatedAt: now,
		};
		courses.push(course);
		return copyCourse(course);
	},

	async getLessons(courseId) {
		return lessons
			.filter((lesson) => lesson.courseId === courseId)
			.sort((a, b) => a.position - b.position)
			.map(copyLesson);
	},

	async getLesson(id) {
		const lesson = lessons.find((item) => item.id === id);
		return lesson ? copyLesson(lesson) : undefined;
	},

	async createLesson(courseId: string, input: CreateLessonInput) {
		if (!courses.some((course) => course.id === courseId)) {
			throw new Error("Course not found.");
		}

		const { title } = createTitleInputSchema.parse(input);
		const courseLessons = lessons.filter(
			(lesson) => lesson.courseId === courseId,
		);
		const slug = uniqueValue(
			slugify(title),
			courseLessons.map((lesson) => lesson.slug),
		);
		const id = uniqueValue(
			`${courseId}-${slug}`,
			lessons.map((lesson) => lesson.id),
		);
		const now = new Date();
		const lesson: Lesson = {
			id,
			courseId,
			title,
			slug,
			markdown: `# ${title}`,
			themeId: "minimal",
			position: courseLessons.length,
			createdAt: now,
			updatedAt: now,
		};
		lessons.push(lesson);
		return copyLesson(lesson);
	},

	async updateLesson(id: string, input: UpdateLessonInput) {
		const lesson = lessons.find((item) => item.id === id);
		if (!lesson) {
			throw new Error("Lesson not found.");
		}

		const update = updateLessonInputSchema.parse(input);
		Object.assign(
			lesson,
			omitBy(update, (value) => value === undefined),
		);
		lesson.updatedAt = new Date();

		return copyLesson(lesson);
	},
};
