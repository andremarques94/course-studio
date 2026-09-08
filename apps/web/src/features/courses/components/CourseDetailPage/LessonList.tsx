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
import { applyLessonSummary } from "@/features/lessons/cache";
import { lessonQueries } from "@/features/lessons/queries";
import type { Lesson, LessonSummary } from "@/features/lessons/types";
import { courseQueries } from "../../queries";
import { courseRepository } from "../../repository";
import { TITLE_MAX_LENGTH, titleSchema } from "../../schemas";
import styles from "./CourseDetailPage.module.css";

type LessonListProps = {
	courseId: string;
	lessons: readonly LessonSummary[];
	canEdit: boolean;
};

export function LessonList({ courseId, lessons, canEdit }: LessonListProps) {
	const [editingLessonId, setEditingLessonId] = useState<string>();
	const [deletingLessonId, setDeletingLessonId] = useState<string>();
	const [reordering, setReordering] = useState(false);
	const [title, setTitle] = useState("");
	const queryClient = useQueryClient();
	const lessonsQueryKey = courseQueries.lessons(courseId).queryKey;
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
			queryClient.setQueryData<LessonSummary[]>(lessonsQueryKey, (current) =>
				current?.map((lesson) =>
					lesson.id === updatedLesson.id ? updatedLesson : lesson,
				),
			);
			queryClient.setQueryData<Lesson | null>(
				lessonQueries.detail(updatedLesson.id).queryKey,
				(current) => applyLessonSummary(current, updatedLesson),
			);
			setEditingLessonId(undefined);
			toast.success("Lesson renamed");
		},
	});
	const deleteLesson = useMutation({
		mutationFn: (lessonId: string) => courseRepository.deleteLesson(lessonId),
		onSuccess: (_, lessonId) => {
			queryClient.setQueryData<LessonSummary[]>(lessonsQueryKey, (current) =>
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
			for (const lesson of orderedLessons) {
				queryClient.setQueryData<Lesson | null>(
					lessonQueries.detail(lesson.id).queryKey,
					(current) => applyLessonSummary(current, lesson),
				);
			}
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
			nextLessons[targetIndex],
			nextLessons[index],
		];
		reorderLessons.mutate(nextLessons.map((lesson) => lesson.id));
	};
	const error = updateLesson.error ?? reorderLessons.error;
	const deletingLesson = lessons.find(
		(lesson) => lesson.id === deletingLessonId,
	);

	return (
		<>
			<section className={styles.outline} aria-labelledby="lesson-list-title">
				<div className={styles.lessonListHeader}>
					<div>
						<h2 id="lesson-list-title">Course outline</h2>
						<p className={styles.lessonSummary}>
							{getLessonSummary(lessons.length, canEdit)}
						</p>
					</div>
					{canEdit && lessons.length > 1 ? (
						<Button
							type="button"
							variant={reordering ? "default" : "outline"}
							className={styles.reorderToggle}
							onClick={() => setReordering((current) => !current)}
						>
							{reordering ? null : <ListRestart data-icon="inline-start" />}
							{reordering ? "Done arranging" : "Arrange lessons"}
						</Button>
					) : null}
				</div>
				{reordering ? (
					<p className={styles.reorderHint} aria-live="polite">
						{reorderLessons.isPending
							? "Saving lesson order..."
							: "Use the arrow buttons to set the teaching order."}
					</p>
				) : null}
				<ol className={styles.lessonList}>
					{lessons.map((lesson, index) => (
						<li key={lesson.id} className={styles.lessonRow}>
							{editingLessonId === lesson.id && (
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
							)}
							{editingLessonId !== lesson.id && reordering && (
								<div className={styles.lessonReorderItem}>
									<span className={styles.position}>
										{String(index + 1).padStart(2, "0")}
									</span>
									<span className={styles.lessonIcon}>
										<FileText aria-hidden="true" />
									</span>
									<span className={styles.lessonTitle}>{lesson.title}</span>
								</div>
							)}
							{editingLessonId !== lesson.id && !reordering && (
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
									<span className={styles.openLabel}>
										{canEdit ? "Open editor" : "View lesson"}
									</span>
									<ArrowRight className={styles.arrow} aria-hidden="true" />
								</Link>
							)}
							<LessonRowActions
								visible={canEdit && editingLessonId !== lesson.id}
								reordering={reordering}
								lessonTitle={lesson.title}
								isFirst={index === 0}
								isLast={index === lessons.length - 1}
								isPending={reorderLessons.isPending}
								onMoveUp={() => moveLesson(index, -1)}
								onMoveDown={() => moveLesson(index, 1)}
								onRename={() => {
									setTitle(lesson.title);
									setEditingLessonId(lesson.id);
								}}
								onDeleteRequest={() => {
									deleteLesson.reset();
									setDeletingLessonId(lesson.id);
								}}
							/>
						</li>
					))}
				</ol>
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
			</section>
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
		</>
	);
}

function getLessonSummary(lessonCount: number, canEdit: boolean) {
	if (lessonCount === 0) {
		return "Add the first lesson to begin writing.";
	}
	if (canEdit) {
		return "Open a lesson to continue writing.";
	}
	return "Open a lesson to view its presentation.";
}

function LessonRowActions({
	visible,
	reordering,
	lessonTitle,
	isFirst,
	isLast,
	isPending,
	onMoveUp,
	onMoveDown,
	onRename,
	onDeleteRequest,
}: {
	visible: boolean;
	reordering: boolean;
	lessonTitle: string;
	isFirst: boolean;
	isLast: boolean;
	isPending: boolean;
	onMoveUp(): void;
	onMoveDown(): void;
	onRename(): void;
	onDeleteRequest(): void;
}) {
	if (!visible) {
		return null;
	}
	if (reordering) {
		return (
			<div className={styles.reorderActions}>
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label={`Move ${lessonTitle} up`}
					onClick={onMoveUp}
					disabled={isFirst || isPending}
				>
					<ArrowUp />
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label={`Move ${lessonTitle} down`}
					onClick={onMoveDown}
					disabled={isLast || isPending}
				>
					<ArrowDown />
				</Button>
			</div>
		);
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={styles.lessonMenuTrigger}
						aria-label={`Actions for ${lessonTitle}`}
					/>
				}
			>
				<Ellipsis />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={onRename}>
						<Pencil />
						Rename lesson
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem variant="destructive" onClick={onDeleteRequest}>
						<Trash2 />
						Delete lesson
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
