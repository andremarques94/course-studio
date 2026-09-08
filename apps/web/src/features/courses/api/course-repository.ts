import type { z } from "zod";
import type { updateLessonInputSchema } from "@/features/lessons/schemas";
import type { Lesson, LessonSummary } from "@/features/lessons/types";
import type {
	createInvitationInputSchema,
	createTitleInputSchema,
	invitationTokenSchema,
} from "../schemas";
import type { Course, CourseInvitation, CourseMember } from "../types";

export type CreateCourseInput = z.input<typeof createTitleInputSchema>;
export type CreateLessonInput = z.input<typeof createTitleInputSchema>;
export type UpdateCourseInput = z.input<typeof createTitleInputSchema>;
export type UpdateLessonInput = z.input<typeof updateLessonInputSchema>;
export type CreateInvitationInput = z.input<typeof createInvitationInputSchema>;
export type AcceptInvitationInput = z.input<typeof invitationTokenSchema>;

export type CourseRepository = {
	getCourses(): Promise<Course[]>;
	getCourse(id: string): Promise<Course | undefined>;
	createCourse(input: CreateCourseInput): Promise<Course>;
	updateCourse(id: string, input: UpdateCourseInput): Promise<Course>;
	deleteCourse(id: string): Promise<void>;
	getLessons(courseId: string): Promise<LessonSummary[]>;
	getLesson(id: string): Promise<Lesson | undefined>;
	createLesson(
		courseId: string,
		input: CreateLessonInput,
	): Promise<LessonSummary>;
	updateLesson(id: string, input: UpdateLessonInput): Promise<LessonSummary>;
	deleteLesson(id: string): Promise<void>;
	reorderLessons(
		courseId: string,
		lessonIds: string[],
	): Promise<LessonSummary[]>;
	getMembers(courseId: string): Promise<CourseMember[]>;
	removeMember(courseId: string, memberId: string): Promise<void>;
	getInvitations(courseId: string): Promise<CourseInvitation[]>;
	createInvitation(
		courseId: string,
		input: CreateInvitationInput,
	): Promise<CourseInvitation>;
	resendInvitation(
		courseId: string,
		invitationId: string,
	): Promise<CourseInvitation>;
	revokeInvitation(courseId: string, invitationId: string): Promise<void>;
	acceptInvitation(
		token: AcceptInvitationInput,
	): Promise<{ courseId: string; role: "editor" | "viewer" }>;
};
