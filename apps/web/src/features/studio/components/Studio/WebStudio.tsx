import { useQueryClient } from "@tanstack/react-query";
import type { Course } from "@/features/courses/types";
import type { Lesson } from "@/features/lessons/types";
import { createWebStudioCommands } from "../../web-studio-adapter";
import { Studio } from "./Studio";

interface WebStudioProps {
	course: Course;
	lesson: Lesson;
	lessons: Lesson[];
}

export function WebStudio({ course, lesson, lessons }: WebStudioProps) {
	const queryClient = useQueryClient();
	const commands = createWebStudioCommands({
		queryClient,
		courseId: course.id,
		lessonId: lesson.id,
	});

	return (
		<Studio
			course={course}
			lesson={lesson}
			lessons={lessons}
			commands={commands}
		/>
	);
}
