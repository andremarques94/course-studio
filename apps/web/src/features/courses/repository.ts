import type { z } from "zod";
import {
	lessonSchema,
	lessonSummariesSchema,
	lessonSummarySchema,
	type updateLessonInputSchema,
} from "@/features/lessons/schemas";
import { api as client } from "@/integrations/api/client";
import { ensureSuccess, readResponse } from "@/integrations/api/response";
import {
	acceptInvitationResponseSchema,
	courseInvitationSchema,
	courseInvitationsSchema,
	courseMembersSchema,
	courseSchema,
	coursesSchema,
	createInvitationInputSchema,
	createTitleInputSchema,
	invitationTokenSchema,
} from "./schemas";

export const courseRepository = {
	async getCourses() {
		const response = await client.api.courses.$get();
		return readResponse(response, coursesSchema);
	},

	async getCourse(id: string) {
		const response = await client.api.courses[":courseId"].$get({
			param: { courseId: id },
		});
		if (response.status === 404) {
			return undefined;
		}
		return readResponse(response, courseSchema);
	},

	async createCourse(input: z.input<typeof createTitleInputSchema>) {
		const json = createTitleInputSchema.parse(input);
		const response = await client.api.courses.$post({ json });
		return readResponse(response, courseSchema);
	},

	async updateCourse(
		id: string,
		input: z.input<typeof createTitleInputSchema>,
	) {
		const json = createTitleInputSchema.parse(input);
		const response = await client.api.courses[":courseId"].$patch({
			param: { courseId: id },
			json,
		});
		return readResponse(response, courseSchema);
	},

	async deleteCourse(id: string) {
		const response = await client.api.courses[":courseId"].$delete({
			param: { courseId: id },
		});
		await ensureSuccess(response);
	},

	async getLessons(courseId: string) {
		const response = await client.api.courses[":courseId"].lessons.$get({
			param: { courseId },
		});
		return readResponse(response, lessonSummariesSchema);
	},

	async getLesson(id: string) {
		const response = await client.api.lessons[":lessonId"].$get({
			param: { lessonId: id },
		});
		if (response.status === 404) {
			return undefined;
		}
		return readResponse(response, lessonSchema);
	},

	async createLesson(
		courseId: string,
		input: z.input<typeof createTitleInputSchema>,
	) {
		const json = createTitleInputSchema.parse(input);
		const response = await client.api.courses[":courseId"].lessons.$post({
			param: { courseId },
			json,
		});
		return readResponse(response, lessonSummarySchema);
	},

	async updateLesson(
		id: string,
		input: z.input<typeof updateLessonInputSchema>,
	) {
		const response = await client.api.lessons[":lessonId"].$patch({
			param: { lessonId: id },
			json: input,
		});
		return readResponse(response, lessonSummarySchema);
	},

	async deleteLesson(id: string) {
		const response = await client.api.lessons[":lessonId"].$delete({
			param: { lessonId: id },
		});
		await ensureSuccess(response);
	},

	async reorderLessons(courseId: string, lessonIds: string[]) {
		const response = await client.api.courses[":courseId"].lessons.order.$put({
			param: { courseId },
			json: { lessonIds },
		});
		return readResponse(response, lessonSummariesSchema);
	},

	async getMembers(courseId: string) {
		const response = await client.api.courses[":courseId"].members.$get({
			param: { courseId },
		});
		return readResponse(response, courseMembersSchema);
	},

	async removeMember(courseId: string, memberId: string) {
		const response = await client.api.courses[":courseId"].members[
			":memberId"
		].$delete({ param: { courseId, memberId } });
		await ensureSuccess(response);
	},

	async getInvitations(courseId: string) {
		const response = await client.api.courses[":courseId"].invitations.$get({
			param: { courseId },
		});
		return readResponse(response, courseInvitationsSchema);
	},

	async createInvitation(
		courseId: string,
		input: z.input<typeof createInvitationInputSchema>,
	) {
		const json = createInvitationInputSchema.parse(input);
		const response = await client.api.courses[":courseId"].invitations.$post({
			param: { courseId },
			json,
		});
		return readResponse(response, courseInvitationSchema);
	},

	async resendInvitation(courseId: string, invitationId: string) {
		const response = await client.api.courses[":courseId"].invitations[
			":invitationId"
		].resend.$post({ param: { courseId, invitationId } });
		return readResponse(response, courseInvitationSchema);
	},

	async revokeInvitation(courseId: string, invitationId: string) {
		const response = await client.api.courses[":courseId"].invitations[
			":invitationId"
		].$delete({ param: { courseId, invitationId } });
		await ensureSuccess(response);
	},

	async acceptInvitation(token: z.input<typeof invitationTokenSchema>) {
		const response = await client.api.invitations.accept.$post({
			json: { token: invitationTokenSchema.parse(token) },
		});
		return readResponse(response, acceptInvitationResponseSchema);
	},
};
