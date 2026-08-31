export function slugify(value: string): string {
	return (
		value
			.normalize("NFKD")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "untitled"
	);
}
