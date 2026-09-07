import { Button } from "@course-studio/ui/components/button";
import { Input } from "@course-studio/ui/components/input";
import type { SubmitEvent } from "react";
import { TITLE_MAX_LENGTH, titleSchema } from "../../../../schemas";
import styles from "../../CourseDetailPage.module.css";

export function RenameCourseForm({
	title,
	isPending,
	error,
	onTitleChange,
	onSubmit,
	onCancel,
}: {
	title: string;
	isPending: boolean;
	error?: Error | null;
	onTitleChange(value: string): void;
	onSubmit(event: SubmitEvent<HTMLFormElement>): void;
	onCancel(): void;
}) {
	return (
		<form className={styles.titleEditor} onSubmit={onSubmit}>
			<label htmlFor="course-name" className={styles.srOnly}>
				Course name
			</label>
			<Input
				id="course-name"
				value={title}
				onChange={(event) => onTitleChange(event.target.value)}
				maxLength={TITLE_MAX_LENGTH}
				autoComplete="off"
				autoFocus
			/>
			<Button
				type="submit"
				size="sm"
				disabled={!titleSchema.safeParse(title).success || isPending}
			>
				{isPending ? "Saving..." : "Save"}
			</Button>
			<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
				Cancel
			</Button>
			{error ? (
				<p className={styles.actionError} role="alert">
					{error.message}
				</p>
			) : null}
		</form>
	);
}
