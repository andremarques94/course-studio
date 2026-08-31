import { toast } from "@course-studio/ui/components/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { courseRepository } from "../../repository";
import { CreateTitleForm } from "../CreateTitleForm";

interface CreateLessonFormProps {
	courseId: string;
}

export function CreateLessonForm({ courseId }: CreateLessonFormProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const createLesson = async (title: string) => {
		const lesson = await courseRepository.createLesson(courseId, { title });
		toast.success("Lesson created");
		await queryClient.invalidateQueries({
			queryKey: ["courses", courseId, "lessons"],
		});
		await navigate({
			to: "/studio/courses/$courseId/lessons/$lessonId",
			params: { courseId, lessonId: lesson.id },
		});
	};

	return (
		<CreateTitleForm
			inputId="lesson-title"
			label="New lesson"
			placeholder="Lesson name"
			onCreate={createLesson}
		/>
	);
}
