import assert from "node:assert/strict";
import { test } from "node:test";
import { Markdown } from "@revealjs/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { safeMarkdownOptions } from "./safe-markdown";

function render(markdown: string) {
	return renderToStaticMarkup(
		createElement(Markdown, {
			options: safeMarkdownOptions,
			elementAttributesSeparator: "(?!)",
			slideAttributesSeparator: "(?!)",
			markdown,
		}),
	);
}

test("untrusted Markdown cannot inject executable HTML or Reveal attributes", () => {
	const html = render(
		[
			'<img src="https://example.com/image.png" onerror="alert(1)">',
			'<script>alert(1)</script><svg onload="alert(1)"></svg>',
			'<iframe srcdoc="<script>alert(1)</script>"></iframe>',
			"[unsafe](javascript:alert%281%29)",
			'<a href="java&#x73;cript:alert(1)">encoded</a>',
			'<img src="data:image/svg+xml;base64,PHN2Zz4=">',
			'<!-- .slide: onmouseenter="alert(1)" -->',
			'<!-- .element onclick="alert(1)" -->',
			'notes: <img src="x" onerror="alert(1)">',
		].join("\n\n"),
	);
	assert.doesNotMatch(
		html,
		/onerror|onload|onclick|onmouseenter|javascript:|data:image|<script|<svg|<iframe|<!--/i,
	);
});

test("preserves lesson formatting, images, code, links, slides and notes", () => {
	const html = render(
		'# Heading\n\n**bold** [link](https://example.com)\n\n![Diagram](https://example.com/a.png)\n\n```js\nconst x = "<script>";\n```\n\n---\n\nSecond slide\n\nnotes: Speaker notes',
	);
	assert.match(html, /<h1>Heading<\/h1>/);
	assert.match(html, /<strong>bold<\/strong>/);
	assert.match(html, /href="https:\/\/example.com"/);
	assert.match(html, /alt="Diagram"/);
	assert.match(html, /&lt;script&gt;/);
	assert.equal((html.match(/<section/g) ?? []).length, 2);
	assert.match(html, /<aside class="notes">/);
});
