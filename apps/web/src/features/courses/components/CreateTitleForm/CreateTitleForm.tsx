import { Button } from "@course-studio/ui/components/button";
import { Input } from "@course-studio/ui/components/input";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { TITLE_MAX_LENGTH, titleSchema } from "../../schemas";
import styles from "./CreateTitleForm.module.css";

type CreateTitleFormProps = {
	inputId: string;
	label: string;
	placeholder: string;
	onCreate: (title: string) => Promise<void>;
};

export function CreateTitleForm({
	inputId,
	label,
	placeholder,
	onCreate,
}: CreateTitleFormProps) {
	const [title, setTitle] = useState("");
	const parsedTitle = titleSchema.safeParse(title);
	const create = useMutation({
		mutationFn: async (value: string) => {
			const result = titleSchema.safeParse(value);
			if (!result.success) {
				throw new Error(result.error.issues[0]?.message ?? "Invalid title.");
			}
			await onCreate(result.data);
		},
	});

	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		create.mutate(title);
	};

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			<label htmlFor={inputId}>{label}</label>
			<div className={styles.controls}>
				<Input
					id={inputId}
					value={title}
					onChange={(event) => {
						setTitle(event.target.value);
						create.reset();
					}}
					placeholder={placeholder}
					maxLength={TITLE_MAX_LENGTH}
					autoComplete="off"
				/>
				<Button
					type="submit"
					disabled={!parsedTitle.success || create.isPending}
				>
					<Plus data-icon="inline-start" />
					{create.isPending ? "Creating" : "Create"}
				</Button>
			</div>
			{create.error ? (
				<p className={styles.error} role="alert">
					{create.error.message}
				</p>
			) : null}
		</form>
	);
}
