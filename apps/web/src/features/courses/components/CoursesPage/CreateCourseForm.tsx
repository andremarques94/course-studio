import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { courseRepository } from "../../repository";
import { CreateTitleForm } from "../CreateTitleForm";

export function CreateCourseForm() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const createCourse = async (title: string) => {
		const course = await courseRepository.createCourse({ title });
		await queryClient.invalidateQueries({ queryKey: ["courses"] });
		await navigate({
			to: "/studio/courses/$courseId",
			params: { courseId: course.id },
		});
	};

	return (
		<CreateTitleForm
			inputId="course-title"
			label="New course"
			placeholder="Course name"
			onCreate={createCourse}
		/>
	);
}
