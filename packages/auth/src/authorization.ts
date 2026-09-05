export type OwnedCourse = {
	ownerId: string;
};

export type LessonWithCourse = {
	course: OwnedCourse;
};

export function canViewCourse(userId: string, course: OwnedCourse) {
	return course.ownerId === userId;
}

export function canEditCourse(userId: string, course: OwnedCourse) {
	return course.ownerId === userId;
}

export function canPublishCourse(userId: string, course: OwnedCourse) {
	return course.ownerId === userId;
}

export function canEditLesson(userId: string, lesson: LessonWithCourse) {
	return canEditCourse(userId, lesson.course);
}
