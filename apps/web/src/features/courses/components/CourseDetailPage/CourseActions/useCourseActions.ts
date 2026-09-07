import { toast } from "@course-studio/ui/components/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { courseQueries } from "../../../queries";
import { courseRepository } from "../../../repository";
import { titleSchema } from "../../../schemas";
import type { Course } from "../../../types";

export function useCourseActions(course: Course) {
	const [editing, setEditing] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [sharing, setSharing] = useState(false);
	const [title, setTitle] = useState(course.title);
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const updateCourse = useMutation({
		mutationFn: async () => {
			const result = titleSchema.safeParse(title);
			if (!result.success) {
				throw new Error(result.error.issues[0]?.message ?? "Invalid title.");
			}
			return courseRepository.updateCourse(course.id, { title: result.data });
		},
		onSuccess: async (updatedCourse) => {
			queryClient.setQueryData(
				courseQueries.detail(course.id).queryKey,
				updatedCourse,
			);
			await queryClient.invalidateQueries({
				queryKey: courseQueries.all().queryKey,
				exact: true,
			});
			setEditing(false);
			toast.success("Course renamed");
		},
	});

	const deleteCourse = useMutation({
		mutationFn: () => courseRepository.deleteCourse(course.id),
		onSuccess: async () => {
			toast.success("Course deleted");
			await queryClient.invalidateQueries({
				queryKey: courseQueries.all().queryKey,
				exact: true,
			});
			await navigate({ to: "/studio/courses" });
			queryClient.removeQueries({
				queryKey: courseQueries.detail(course.id).queryKey,
			});
		},
	});

	function startEditing() {
		setTitle(course.title);
		updateCourse.reset();
		setEditing(true);
	}

	function cancelEditing() {
		setTitle(course.title);
		setEditing(false);
		updateCourse.reset();
	}

	function confirmDelete() {
		deleteCourse.reset();
		setConfirmingDelete(true);
	}

	return {
		editing,
		confirmingDelete,
		setConfirmingDelete,
		sharing,
		setSharing,
		title,
		setTitle,
		updateCourse,
		deleteCourse,
		startEditing,
		cancelEditing,
		confirmDelete,
		isOwner: course.accessRole === "owner",
		canEditCourse: course.accessRole !== "viewer",
	};
}

export type CourseActionsState = ReturnType<typeof useCourseActions>;
