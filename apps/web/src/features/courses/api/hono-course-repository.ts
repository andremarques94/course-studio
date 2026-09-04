import { z } from "zod";
import { lessonSchema, lessonsSchema } from "@/features/lessons/schemas";
import { api as client } from "@/integrations/api/client";
import {
	courseSchema,
	coursesSchema,
	createTitleInputSchema,
} from "../schemas";
import type {
	CourseRepository,
	CreateCourseInput,
	CreateLessonInput,
	UpdateCourseInput,
	UpdateLessonInput,
} from "./course-repository";

const errorResponseSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
	}),
});

async function throwRequestError(response: Response): Promise<never> {
	const body = await response.json().catch(() => undefined);
	const parsed = errorResponseSchema.safeParse(body);

	throw new Error(
		parsed.success ? parsed.data.error.message : "The API request failed.",
	);
}

export const honoCourseRepository: CourseRepository = {
	async getCourses() {
		const response = await client.api.courses.$get();
		if (!response.ok) {
			return throwRequestError(response);
		}
		return coursesSchema.parse(await response.json());
	},

	async getCourse(id: string) {
		const response = await client.api.courses[":courseId"].$get({
			param: { courseId: id },
		});
		if (response.status === 404) {
			return undefined;
		}
		if (!response.ok) {
			return throwRequestError(response);
		}
		return courseSchema.parse(await response.json());
	},

	async createCourse(input: CreateCourseInput) {
		const json = createTitleInputSchema.parse(input);
		const response = await client.api.courses.$post({ json });
		if (!response.ok) {
			return throwRequestError(response);
		}
		return courseSchema.parse(await response.json());
	},

	async updateCourse(id: string, input: UpdateCourseInput) {
		const json = createTitleInputSchema.parse(input);
		const response = await client.api.courses[":courseId"].$patch({
			param: { courseId: id },
			json,
		});
		if (!response.ok) {
			return throwRequestError(response);
		}
		return courseSchema.parse(await response.json());
	},

	async deleteCourse(id: string) {
		const response = await client.api.courses[":courseId"].$delete({
			param: { courseId: id },
		});
		if (!response.ok) {
			return throwRequestError(response);
		}
	},

	async getLessons(courseId: string) {
		const response = await client.api.courses[":courseId"].lessons.$get({
			param: { courseId },
		});
		if (!response.ok) {
			return throwRequestError(response);
		}
		return lessonsSchema.parse(await response.json());
	},

	async getLesson(id: string) {
		const response = await client.api.lessons[":lessonId"].$get({
			param: { lessonId: id },
		});
		if (response.status === 404) {
			return undefined;
		}
		if (!response.ok) {
			return throwRequestError(response);
		}
		return lessonSchema.parse(await response.json());
	},

	async createLesson(courseId: string, input: CreateLessonInput) {
		const json = createTitleInputSchema.parse(input);
		const response = await client.api.courses[":courseId"].lessons.$post({
			param: { courseId },
			json,
		});
		if (!response.ok) {
			return throwRequestError(response);
		}
		return lessonSchema.parse(await response.json());
	},

	async updateLesson(id: string, input: UpdateLessonInput) {
		const response = await client.api.lessons[":lessonId"].$patch({
			param: { lessonId: id },
			json: input,
		});
		if (!response.ok) {
			return throwRequestError(response);
		}
		return lessonSchema.parse(await response.json());
	},

	async deleteLesson(id: string) {
		const response = await client.api.lessons[":lessonId"].$delete({
			param: { lessonId: id },
		});
		if (!response.ok) {
			return throwRequestError(response);
		}
	},

	async reorderLessons(courseId: string, lessonIds: string[]) {
		const response = await client.api.courses[":courseId"].lessons.order.$put({
			param: { courseId },
			json: { lessonIds },
		});
		if (!response.ok) {
			return throwRequestError(response);
		}
		return lessonsSchema.parse(await response.json());
	},
};
