import type { z } from "zod";
import type { updateLessonInputSchema } from "@/features/lessons/schemas";
import type { Lesson } from "@/features/lessons/types";
import type { createTitleInputSchema } from "./schemas";
import type { Course } from "./types";

export type CreateCourseInput = z.input<typeof createTitleInputSchema>;
export type CreateLessonInput = z.input<typeof createTitleInputSchema>;
export type UpdateCourseInput = z.input<typeof createTitleInputSchema>;
export type UpdateLessonInput = z.input<typeof updateLessonInputSchema>;

export interface CourseRepository {
	getCourses(): Promise<Course[]>;
	getCourse(id: string): Promise<Course | undefined>;
	createCourse(input: CreateCourseInput): Promise<Course>;
	updateCourse(id: string, input: UpdateCourseInput): Promise<Course>;
	deleteCourse(id: string): Promise<void>;
	getLessons(courseId: string): Promise<Lesson[]>;
	getLesson(id: string): Promise<Lesson | undefined>;
	createLesson(courseId: string, input: CreateLessonInput): Promise<Lesson>;
	updateLesson(id: string, input: UpdateLessonInput): Promise<Lesson>;
	deleteLesson(id: string): Promise<void>;
	reorderLessons(courseId: string, lessonIds: string[]): Promise<Lesson[]>;
}
