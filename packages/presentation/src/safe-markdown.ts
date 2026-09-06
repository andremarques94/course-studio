import type { MarkdownOptions } from "@revealjs/react";
import sanitizeHtml from "sanitize-html";

// Run after Markdown parsing, including code highlighting annotations and notes.
// Reveal's comment-based attribute processing is disabled at the call site.
export function sanitizePresentationHtml(html: string): string {
	return sanitizeHtml(html, {
		allowedTags: [
			"p",
			"br",
			"hr",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"blockquote",
			"ul",
			"ol",
			"li",
			"strong",
			"em",
			"del",
			"s",
			"pre",
			"code",
			"a",
			"img",
			"table",
			"thead",
			"tbody",
			"tr",
			"th",
			"td",
			"span",
			"sup",
			"sub",
			"kbd",
		],
		allowedAttributes: {
			a: ["href", "title"],
			img: ["src", "alt", "title", "width", "height"],
			code: ["class", "data-line-numbers", "data-ln-start-from"],
			ol: ["start"],
			th: ["colspan", "rowspan", "align"],
			td: ["colspan", "rowspan", "align"],
		},
		allowedSchemes: ["https", "http", "mailto"],
		allowedSchemesByTag: { img: ["https", "http"] },
		allowProtocolRelative: false,
		parseStyleAttributes: false,
	});
}

// The adapter forwards Marked extensions, but its published type omits hooks.
export const safeMarkdownOptions: MarkdownOptions & {
	hooks: { postprocess: typeof sanitizePresentationHtml };
} = {
	hooks: { postprocess: sanitizePresentationHtml },
};
