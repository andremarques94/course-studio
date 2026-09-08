import type { MarkdownOptions } from "@revealjs/react";
import DOMPurify from "isomorphic-dompurify";

// Lesson Markdown may contain raw HTML from course editors, which is rendered
// into other people's browsers via the Reveal deck. This strips everything
// executable (scripts, event handlers, javascript:/data: URLs) while keeping
// lesson formatting. isomorphic-dompurify is used because the same code must
// run in the browser and in Node (SSR and tests); the hook below exists only
// for the two things the library cannot express: per-tag attributes and the
// stricter URL scheme policy.
const allowedAttributesByTag: Record<string, readonly string[]> = {
	a: ["href", "title"],
	img: ["src", "alt", "title", "width", "height"],
	code: ["class", "data-line-numbers", "data-ln-start-from"],
	ol: ["start"],
	th: ["colspan", "rowspan", "align"],
	td: ["colspan", "rowspan", "align"],
};

function isAllowedUrl(tagName: string, attrName: string, value: string) {
	const url = value.trim();
	if (url.startsWith("//")) {
		return false;
	}
	const scheme = /^[a-z][a-z\d+.-]*:/i.exec(url)?.[0].toLowerCase();
	if (!scheme) {
		return true;
	}
	if (tagName === "a" && attrName === "href") {
		return scheme === "http:" || scheme === "https:" || scheme === "mailto:";
	}
	return scheme === "http:" || scheme === "https:";
}

DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
	const tagName = node.tagName.toLowerCase();
	const attrName = data.attrName.toLowerCase();
	if (!allowedAttributesByTag[tagName]?.includes(attrName)) {
		data.keepAttr = false;
		return;
	}
	if (attrName === "href" || attrName === "src") {
		data.keepAttr = isAllowedUrl(tagName, attrName, data.attrValue);
	}
});

export function sanitizePresentationHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
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
		ALLOWED_ATTR: [...new Set(Object.values(allowedAttributesByTag).flat())],
		ALLOW_DATA_ATTR: false,
	});
}

export const safeMarkdownOptions: MarkdownOptions & {
	hooks: { postprocess: typeof sanitizePresentationHtml };
} = {
	hooks: { postprocess: sanitizePresentationHtml },
};
