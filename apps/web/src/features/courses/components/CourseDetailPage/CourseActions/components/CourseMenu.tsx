import { Button } from "@course-studio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@course-studio/ui/components/dropdown-menu";
import { Ellipsis, Pencil, Trash2, Users } from "lucide-react";

export function CourseMenu({
	isOwner,
	onRename,
	onShare,
	onDelete,
}: {
	isOwner: boolean;
	onRename(): void;
	onShare(): void;
	onDelete(): void;
}) {
	return (
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
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={onRename}>
						<Pencil />
						Rename course
					</DropdownMenuItem>
				</DropdownMenuGroup>
				{isOwner ? <DropdownMenuSeparator /> : null}
				{isOwner ? (
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={onShare}>
							<Users />
							Share course
						</DropdownMenuItem>
						<DropdownMenuItem variant="destructive" onClick={onDelete}>
							<Trash2 />
							Delete course
						</DropdownMenuItem>
					</DropdownMenuGroup>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
