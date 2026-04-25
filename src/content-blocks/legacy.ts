/**
 * Compatibility layer for the pre-block-editor data shape produced by the
 * TipTap-backed `RichTextEditor` in merchant-portal.
 *
 * Pre-block-editor records look like:
 *   `[{ type: 'paragraph', data: { text: '<p>html…</p>' } }]`
 * with no `id`, no `version`. `parseBlocks` already accepts these via the
 * paragraph plugin's lenient validator + this helper which fills in the
 * envelope fields.
 */

import type { AnyBlock } from "../types/content-blocks.js";
import { makeBlockId } from "./index.js";

/**
 * Wrap a plain HTML string as a single paragraph block array.
 * Returns an empty array on empty input.
 */
export function htmlToBlocks(html: string): AnyBlock[] {
	if (!html || html.trim() === "") return [];
	return [{
		id: makeBlockId(),
		type: "paragraph",
		version: 1,
		data: { html },
	}];
}

/**
 * Best-effort: recover an HTML preview from a blocks array. Used by the
 * existing rich-text editor as a fallback rendering target while the
 * BlockNote-based editor is being rolled out.
 *
 * Lossy by design: only paragraph/heading/list-style blocks contribute.
 * Do not use as a renderer.
 */
export function blocksToHtmlPreview(blocks: AnyBlock[]): string {
	const parts: string[] = [];
	for (const b of blocks) {
		// Skip forward-compat unknown blocks — `data` is `unknown` there.
		if ("__unknown" in b) continue;
		if (b.type === "paragraph") {
			parts.push(b.data.html);
		} else if (b.type === "heading") {
			parts.push(`<h${b.data.level}>${escapeHtml(b.data.text)}</h${b.data.level}>`);
		} else if (b.type === "list") {
			const tag = b.data.ordered ? "ol" : "ul";
			const items = b.data.items.map((i: string) => `<li>${escapeHtml(i)}</li>`).join("");
			parts.push(`<${tag}>${items}</${tag}>`);
		} else if (b.type === "quote") {
			parts.push(`<blockquote>${escapeHtml(b.data.text)}</blockquote>`);
		} else if (b.type === "divider") {
			parts.push("<hr />");
		}
		// Other blocks have no meaningful HTML preview — skip silently.
	}
	return parts.join("\n");
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Auto-extract a plain-text excerpt from a blocks array. Used by the API
 * service for `autoExcerpt`. Strips HTML tags from paragraph blocks.
 */
export function blocksToExcerpt(blocks: AnyBlock[], maxLen = 160): string | null {
	for (const b of blocks) {
		if ("__unknown" in b) continue;
		if (b.type === "paragraph") {
			const text = stripTags(b.data.html).trim();
			if (text) return truncate(text, maxLen);
		}
		if (b.type === "heading") {
			const text = b.data.text.trim();
			if (text) return truncate(text, maxLen);
		}
	}
	return null;
}

function stripTags(html: string): string {
	return html.replace(/<[^>]+>/g, "");
}

function truncate(s: string, max: number): string {
	if (s.length <= max) return s;
	return s.slice(0, max - 1).trimEnd() + "…";
}
