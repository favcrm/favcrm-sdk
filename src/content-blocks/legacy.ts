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
 * Depth-first flatten of a block tree into a linear AnyBlock[]. Container
 * blocks are replaced by their children in order. Use this in renderers and
 * tools that do not understand layout.
 */
export function flattenBlocks(blocks: AnyBlock[]): AnyBlock[] {
	const out: AnyBlock[] = [];
	for (const block of blocks) {
		if ("__unknown" in block || block.type !== "columns") {
			out.push(block);
			continue;
		}
		for (const column of block.data.columns) {
			out.push(...flattenBlocks(column.blocks));
		}
	}
	return out;
}

/**
 * Compatibility helper for callers that still start with plain HTML/text.
 *
 * Deprecated for new write paths: prefer authoring `AnyBlock[]` directly.
 * This helper remains exported for older SDK consumers, but it now normalizes
 * obvious paragraphs instead of storing a whole document in one paragraph.
 */
export function htmlToBlocks(html: string): AnyBlock[] {
	return splitHtmlIntoParagraphs(html).map((paragraphHtml) => ({
		id: makeBlockId(),
		type: "paragraph",
		version: 1,
		data: { html: paragraphHtml },
	}));
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
	for (const b of flattenBlocks(blocks)) {
		// Skip forward-compat unknown blocks — `data` is `unknown` there.
		if ("__unknown" in b) continue;
		if (b.type === "paragraph") {
			parts.push(renderableParagraphHtml(b.data.html));
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

function splitHtmlIntoParagraphs(html: string): string[] {
	const trimmed = html.trim();
	if (!trimmed) return [];

	const blockMatches = Array.from(trimmed.matchAll(/<(p|div)\b[^>]*>([\s\S]*?)<\/\1>/gi));
	if (blockMatches.length > 0) {
		return blockMatches.flatMap((match) => splitParagraphText(match[2] ?? ""));
	}

	return splitParagraphText(trimmed);
}

function splitParagraphText(html: string): string[] {
	return html
		.replace(/\r\n?/g, "\n")
		.replace(/<br\s*\/?>/gi, "\n")
		.split(/\n{2,}/)
		.map((part) => part.trim().replace(/\n/g, "<br>"))
		.filter(Boolean);
}

function hasBlockWrapper(html: string): boolean {
	return /<\/?(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|section|article)\b/i.test(html);
}

function renderableParagraphHtml(html: string): string {
	if (hasBlockWrapper(html)) return html;
	const parts = splitParagraphText(html);
	if (parts.length <= 1) return parts[0] ?? "";
	return parts.map((part) => `<p>${part}</p>`).join("\n");
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
	for (const b of flattenBlocks(blocks)) {
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
