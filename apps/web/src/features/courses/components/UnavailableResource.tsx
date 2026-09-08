import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@course-studio/ui/components/empty";
import { Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";

type UnavailableResourceProps =
	| { resource: "course" }
	| { resource: "lesson"; courseId: string };

export function UnavailableResource(props: UnavailableResourceProps) {
	const isCourse = props.resource === "course";

	return (
		<main>
			<Empty className="min-h-dvh rounded-none">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<SearchX />
					</EmptyMedia>
					<EmptyTitle>
						{isCourse ? "Course unavailable" : "Lesson unavailable"}
					</EmptyTitle>
					<EmptyDescription>
						It may not exist, or you may no longer have access.{" "}
						{isCourse ? (
							<Link to="/studio/courses">Return to courses</Link>
						) : (
							<Link
								to="/studio/courses/$courseId"
								params={{ courseId: props.courseId }}
							>
								Return to course
							</Link>
						)}
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</main>
	);
}
