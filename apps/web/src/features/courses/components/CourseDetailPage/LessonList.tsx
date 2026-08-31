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
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@course-studio/ui/components/empty";
import { Input } from "@course-studio/ui/components/input";
import { toast } from "@course-studio/ui/components/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowDown,
	ArrowRight,
	ArrowUp,
	Ellipsis,
	FileText,
	ListRestart,
	Pencil,
	Trash2,
	TriangleAlert,
} from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { lessonQueries } from "@/features/lessons/queries";
import type { Lesson } from "@/features/lessons/types";
import { courseRepository } from "../../repository";
import { TITLE_MAX_LENGTH, titleSchema } from "../../schemas";
import styles from "./CourseDetailPage.module.css";

interface LessonListProps {
	courseId: string;
	lessons: readonly Lesson[];
}

export function LessonList({ courseId, lessons }: LessonListProps) {
	const [editingLessonId, setEditingLessonId] = useState<string>();
	const [deletingLessonId, setDeletingLessonId] = useState<string>();
	const [reordering, setReordering] = useState(false);
	const [title, setTitle] = useState("");
	const queryClient = useQueryClient();
	const lessonsQueryKey = ["courses", courseId, "lessons"] as const;
	const updateLesson = useMutation({
		mutationFn: async ({
			lessonId,
			title,
		}: {
			lessonId: string;
			title: string;
		}) => {
			const result = titleSchema.safeParse(title);
			if (!result.success) {
				throw new Error(result.error.issues[0]?.message ?? "Invalid title.");
			}
			return courseRepository.updateLesson(lessonId, { title: result.data });
		},
		onSuccess: (updatedLesson) => {
			queryClient.setQueryData<Lesson[]>(lessonsQueryKey, (current) =>
				current?.map((lesson) =>
					lesson.id === updatedLesson.id ? updatedLesson : lesson,
				),
			);
			queryClient.setQueryData(
				lessonQueries.detail(updatedLesson.id).queryKey,
				updatedLesson,
			);
			setEditingLessonId(undefined);
			toast.success("Lesson renamed");
		},
	});
	const deleteLesson = useMutation({
		mutationFn: (lessonId: string) => courseRepository.deleteLesson(lessonId),
		onSuccess: (_, lessonId) => {
			queryClient.setQueryData<Lesson[]>(lessonsQueryKey, (current) =>
				current?.filter((lesson) => lesson.id !== lessonId),
			);
			queryClient.removeQueries({
				queryKey: lessonQueries.detail(lessonId).queryKey,
			});
			setDeletingLessonId(undefined);
			toast.success("Lesson deleted");
		},
	});
	const reorderLessons = useMutation({
		mutationFn: (lessonIds: string[]) =>
			courseRepository.reorderLessons(courseId, lessonIds),
		onSuccess: (orderedLessons) => {
			queryClient.setQueryData(lessonsQueryKey, orderedLessons);
			toast.success("Lesson order updated", { id: "lesson-order" });
		},
	});

	const handleRename = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (editingLessonId) {
			updateLesson.mutate({ lessonId: editingLessonId, title });
		}
	};
	const moveLesson = (index: number, offset: -1 | 1) => {
		const nextLessons = [...lessons];
		const targetIndex = index + offset;
		[nextLessons[index], nextLessons[targetIndex]] = [
			nextLessons[targetIndex] as Lesson,
			nextLessons[index] as Lesson,
		];
		reorderLessons.mutate(nextLessons.map((lesson) => lesson.id));
	};
	const error = updateLesson.error ?? reorderLessons.error;
	const deletingLesson = lessons.find(
		(lesson) => lesson.id === deletingLessonId,
	);

	return (
		<>
			<div className={styles.lessonListHeader}>
				<div>
					<h2>Lessons</h2>
					<p className={styles.reorderHint} aria-live="polite">
						<span
							className={
								reordering && !reorderLessons.isPending
									? undefined
									: styles.reorderHintPlaceholder
							}
						>
							Use the arrow buttons to set the teaching order.
						</span>
						<span
							className={
								reordering && reorderLessons.isPending
									? undefined
									: styles.reorderHintPlaceholder
							}
						>
							Saving lesson order...
						</span>
					</p>
				</div>
				{lessons.length > 1 ? (
					<Button
						type="button"
						variant={reordering ? "default" : "outline"}
						onClick={() => setReordering((current) => !current)}
					>
						{reordering ? null : <ListRestart data-icon="inline-start" />}
						{reordering ? "Done" : "Reorder"}
					</Button>
				) : null}
			</div>
			<ol className={styles.lessonList}>
				{lessons.map((lesson, index) => (
					<li key={lesson.id} className={styles.lessonRow}>
						{editingLessonId === lesson.id ? (
							<form
								className={styles.lessonTitleEditor}
								onSubmit={handleRename}
							>
								<label
									htmlFor={`lesson-name-${lesson.id}`}
									className={styles.srOnly}
								>
									Lesson name
								</label>
								<Input
									id={`lesson-name-${lesson.id}`}
									value={title}
									onChange={(event) => {
										setTitle(event.target.value);
										updateLesson.reset();
									}}
									maxLength={TITLE_MAX_LENGTH}
									autoComplete="off"
									autoFocus
								/>
								<Button
									type="submit"
									size="sm"
									disabled={
										!titleSchema.safeParse(title).success ||
										updateLesson.isPending
									}
								>
									{updateLesson.isPending ? "Saving..." : "Save"}
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => {
										setEditingLessonId(undefined);
										updateLesson.reset();
									}}
								>
									Cancel
								</Button>
							</form>
						) : reordering ? (
							<div className={styles.lessonReorderItem}>
								<span className={styles.position}>
									{String(index + 1).padStart(2, "0")}
								</span>
								<span className={styles.lessonIcon}>
									<FileText aria-hidden="true" />
								</span>
								<span className={styles.lessonTitle}>{lesson.title}</span>
							</div>
						) : (
							<Link
								to="/studio/courses/$courseId/lessons/$lessonId"
								params={{ courseId, lessonId: lesson.id }}
								className={styles.lessonLink}
							>
								<span className={styles.position}>
									{String(index + 1).padStart(2, "0")}
								</span>
								<span className={styles.lessonIcon}>
									<FileText aria-hidden="true" />
								</span>
								<span className={styles.lessonTitle}>{lesson.title}</span>
								<span className={styles.openLabel}>Open editor</span>
								<ArrowRight className={styles.arrow} aria-hidden="true" />
							</Link>
						)}
						{editingLessonId === lesson.id ? null : reordering ? (
							<div className={styles.reorderActions}>
								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label={`Move ${lesson.title} up`}
									onClick={() => moveLesson(index, -1)}
									disabled={index === 0 || reorderLessons.isPending}
								>
									<ArrowUp />
								</Button>
								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label={`Move ${lesson.title} down`}
									onClick={() => moveLesson(index, 1)}
									disabled={
										index === lessons.length - 1 || reorderLessons.isPending
									}
								>
									<ArrowDown />
								</Button>
							</div>
						) : (
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className={styles.lessonMenuTrigger}
											aria-label={`Actions for ${lesson.title}`}
										/>
									}
								>
									<Ellipsis />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuGroup>
										<DropdownMenuItem
											onClick={() => {
												setTitle(lesson.title);
												setEditingLessonId(lesson.id);
											}}
										>
											<Pencil />
											Rename lesson
										</DropdownMenuItem>
									</DropdownMenuGroup>
									<DropdownMenuSeparator />
									<DropdownMenuGroup>
										<DropdownMenuItem
											variant="destructive"
											onClick={() => {
												deleteLesson.reset();
												setDeletingLessonId(lesson.id);
											}}
										>
											<Trash2 />
											Delete lesson
										</DropdownMenuItem>
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</li>
				))}
			</ol>
			<AlertDialog
				open={Boolean(deletingLesson)}
				onOpenChange={(open) => {
					if (!open) {
						setDeletingLessonId(undefined);
						deleteLesson.reset();
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete "{deletingLesson?.title}"?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently deletes the lesson and its content. This cannot
							be undone.
						</AlertDialogDescription>
						{deleteLesson.error ? (
							<p className={styles.actionError} role="alert">
								{deleteLesson.error.message}
							</p>
						) : null}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							variant="ghost"
							disabled={deleteLesson.isPending}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								if (deletingLesson) {
									deleteLesson.mutate(deletingLesson.id);
								}
							}}
							disabled={deleteLesson.isPending}
						>
							{deleteLesson.isPending ? "Deleting..." : "Delete lesson"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{error ? (
				<Empty className={styles.errorState} role="alert">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<TriangleAlert />
						</EmptyMedia>
						<EmptyTitle>
							{updateLesson.error
								? "Couldn't rename lesson"
								: "Couldn't reorder lessons"}
						</EmptyTitle>
						<EmptyDescription>Try again.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}
			{lessons.length === 0 ? (
				<Empty className={styles.emptyState}>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<FileText />
						</EmptyMedia>
						<EmptyTitle>No lessons yet</EmptyTitle>
						<EmptyDescription>
							Create a lesson to start writing.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}
		</>
	);
}
