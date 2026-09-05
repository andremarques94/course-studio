import {
	canEditCourse,
	canViewCourse,
} from "@course-studio/auth/authorization";
import { courses, type Database } from "@course-studio/db";
import { eq } from "drizzle-orm";
import { ApiError } from "#api/http/errors/api-error";

export function createCourseAccess(db: Database) {
	async function findCourse(id: string) {
		const [course] = await db
			.select()
			.from(courses)
			.where(eq(courses.id, id))
			.limit(1);
		return course;
	}

	return {
		async findViewable(userId: string, courseId: string) {
			const course = await findCourse(courseId);
			return course && canViewCourse(userId, course) ? course : undefined;
		},

		async requireEditable(userId: string, courseId: string) {
			const course = await findCourse(courseId);
			if (!course || !canEditCourse(userId, course)) {
				throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
			}
			return course;
		},
	};
}
