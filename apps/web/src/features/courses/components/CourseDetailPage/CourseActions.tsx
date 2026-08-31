import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@course-studio/ui/components/alert-dialog";
import { Button } from "@course-studio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@course-studio/ui/components/dropdown-menu";
import { Input } from "@course-studio/ui/components/input";
import { toast } from "@course-studio/ui/components/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { courseQueries } from "../../queries";
import { courseRepository } from "../../repository";
import { TITLE_MAX_LENGTH, titleSchema } from "../../schemas";
import type { Course } from "../../types";
import styles from "./CourseDetailPage.module.css";

interface CourseActionsProps {
	course: Course;
	lessonCount: number;
}

export function CourseActions({ course, lessonCount }: CourseActionsProps) {
	const [editing, setEditing] = useState(false);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
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

	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		updateCourse.mutate();
	};

	if (editing) {
		return (
			<form className={styles.titleEditor} onSubmit={handleSubmit}>
				<label htmlFor="course-name" className={styles.srOnly}>
					Course name
				</label>
				<Input
					id="course-name"
					value={title}
					onChange={(event) => {
						setTitle(event.target.value);
						updateCourse.reset();
					}}
					maxLength={TITLE_MAX_LENGTH}
					autoComplete="off"
					autoFocus
				/>
				<Button
					type="submit"
					size="sm"
					disabled={
						!titleSchema.safeParse(title).success || updateCourse.isPending
					}
				>
					{updateCourse.isPending ? "Saving..." : "Save"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => {
						setTitle(course.title);
						setEditing(false);
						updateCourse.reset();
					}}
				>
					Cancel
				</Button>
				{updateCourse.error ? (
					<p className={styles.actionError} role="alert">
						{updateCourse.error.message}
					</p>
				) : null}
			</form>
		);
	}

	return (
		<div className={styles.courseTitleRow}>
			<h1>{course.title}</h1>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Course actions"
						/>
					}
				>
					<Ellipsis />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={() => setEditing(true)}>
							<Pencil />
							Rename course
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem
							variant="destructive"
							onClick={() => {
								deleteCourse.reset();
								setConfirmingDelete(true);
							}}
						>
							<Trash2 />
							Delete course
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			<AlertDialog
				open={confirmingDelete}
				onOpenChange={(open) => {
					setConfirmingDelete(open);
					if (!open) {
						deleteCourse.reset();
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete "{course.title}"?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently deletes the course and its {lessonCount}{" "}
							{lessonCount === 1 ? "lesson" : "lessons"}. This cannot be undone.
						</AlertDialogDescription>
						{deleteCourse.error ? (
							<p className={styles.actionError} role="alert">
								{deleteCourse.error.message}
							</p>
						) : null}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							variant="ghost"
							disabled={deleteCourse.isPending}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => deleteCourse.mutate()}
							disabled={deleteCourse.isPending}
						>
							{deleteCourse.isPending ? "Deleting..." : "Delete course"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
