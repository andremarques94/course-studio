export type CourseRole = "editor" | "viewer";

export type CourseAccess = {
	ownerId: string;
	membershipRole?: CourseRole | null;
};

export type LessonWithCourse = {
	course: CourseAccess;
};

export function canViewCourse(userId: string, course: CourseAccess) {
	return course.ownerId === userId || course.membershipRole != null;
}

export function canEditCourse(userId: string, course: CourseAccess) {
	return course.ownerId === userId || course.membershipRole === "editor";
}

export function canPublishCourse(userId: string, course: CourseAccess) {
	return course.ownerId === userId;
}

export function canEditLesson(userId: string, lesson: LessonWithCourse) {
	return canEditCourse(userId, lesson.course);
}

export function canManageCourseMembers(userId: string, course: CourseAccess) {
	return course.ownerId === userId;
}
