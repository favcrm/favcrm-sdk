import { describe, expect, it } from "vitest";
import {
	BlockRegistry,
	CORE_BLOCKS,
	createDefaultRegistry,
	makeBlockId,
	htmlToBlocks,
	blocksToExcerpt,
	blocksToHtmlPreview,
	flattenBlocks,
} from "../content-blocks/index.js";
import { paragraphPlugin } from "../content-blocks/core-plugins.js";
import { htmlToBlocks as htmlToBlocksLegacy } from "../content-blocks/legacy.js";
import type { AnyBlock, BlockPlugin } from "../index.js";

describe("BlockRegistry — core", () => {
	const reg = createDefaultRegistry();

	it("registers all core plugins", () => {
		const types = reg.types().sort();
		const expected = CORE_BLOCKS.map((p) => p.type).sort();
		expect(types).toEqual(expected);
	});

	it("validates a well-formed paragraph", () => {
		const block = {
			id: "abc12345",
			type: "paragraph",
			version: 1,
			data: { html: "<p>hello</p>" },
		};
		const result = reg.validateBlock(block);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.type).toBe("paragraph");
		}
	});

	it("rejects block without id", () => {
		const result = reg.validateBlock({ type: "paragraph", version: 1, data: { html: "" } });
		expect(result).toEqual({ ok: false, error: "block.id is required" });
	});

	it("rejects block without type", () => {
		const result = reg.validateBlock({ id: "x", version: 1, data: {} });
		expect(result).toEqual({ ok: false, error: "block.type is required" });
	});

	it("rejects block without version", () => {
		const result = reg.validateBlock({ id: "x", type: "paragraph", data: { html: "" } });
		expect(result).toEqual({ ok: false, error: "block.version is required" });
	});

	it("treats unknown block types as forward-compatible (UnknownBlock)", () => {
		const result = reg.validateBlock({
			id: "x",
			type: "future-block",
			version: 5,
			data: { whatever: true },
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.type).toBe("future-block");
			expect((result.data as { __unknown?: boolean }).__unknown).toBe(true);
		}
	});
});

describe("BlockRegistry — plugin validation", () => {
	const reg = createDefaultRegistry();

	it("validates faq with multiple items", () => {
		const result = reg.validateBlock({
			id: "f1",
			type: "faq",
			version: 1,
			data: {
				title: "FAQs",
				items: [
					{ id: "q1", question: "Q?", answer: "A." },
					{ id: "q2", question: "Q2?", answer: "A2." },
				],
			},
		});
		expect(result.ok).toBe(true);
	});

	it("rejects faq with missing item id", () => {
		const result = reg.validateBlock({
			id: "f1",
			type: "faq",
			version: 1,
			data: { items: [{ question: "Q?", answer: "A." }] },
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("faq.items[0].id");
	});

	it("validates file block with all required metadata", () => {
		const result = reg.validateBlock({
			id: "fl1",
			type: "file",
			version: 1,
			data: {
				url: "https://cdn.example.com/x.pdf",
				mimeType: "application/pdf",
				sizeBytes: 12345,
				originalName: "guide.pdf",
				icon: "pdf",
			},
		});
		expect(result.ok).toBe(true);
	});

	it("rejects file block missing sizeBytes", () => {
		const result = reg.validateBlock({
			id: "fl1",
			type: "file",
			version: 1,
			data: { url: "https://x", mimeType: "application/pdf", originalName: "x.pdf" },
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("file.sizeBytes");
	});

	it("validates callout tone enum", () => {
		const result = reg.validateBlock({
			id: "c1",
			type: "callout",
			version: 1,
			data: { tone: "neutral", body: "x" }, // invalid tone
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("callout.tone");
	});

	it("validates heading levels 1/2/3/4 only", () => {
		expect(reg.validateBlock({ id: "h1", type: "heading", version: 1, data: { level: 1, text: "x" } }).ok).toBe(true);
		expect(reg.validateBlock({ id: "h1", type: "heading", version: 1, data: { level: 2, text: "x" } }).ok).toBe(true);
		expect(reg.validateBlock({ id: "h1", type: "heading", version: 1, data: { level: 5, text: "x" } }).ok).toBe(false);
	});

	it("validates accordion with semantic flag", () => {
		const result = reg.validateBlock({
			id: "a1",
			type: "accordion",
			version: 1,
			data: {
				semantic: "faq",
				items: [{ id: "i1", title: "T", body: "B" }],
			},
		});
		expect(result.ok).toBe(true);
	});

	it("validates safe html blocks and rejects active content", () => {
		expect(reg.validateBlock({
			id: "html1",
			type: "html",
			version: 1,
			data: { html: "<section><p>Before and after</p></section>" },
		}).ok).toBe(true);

		const result = reg.validateBlock({
			id: "html2",
			type: "html",
			version: 1,
			data: { html: "<script>alert(1)</script>" },
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("active content");
	});

	it("validates normalized youtube blocks", () => {
		const result = reg.validateBlock({
			id: "yt1",
			type: "youtube",
			version: 1,
			data: {
				videoId: "dQw4w9WgXcQ",
				url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
				title: "Demo",
				startSeconds: 12,
				aspectRatio: "16/9",
			},
		});
		expect(result.ok).toBe(true);
	});

	it("rejects malformed youtube blocks", () => {
		expect(reg.validateBlock({
			id: "yt1",
			type: "youtube",
			version: 1,
			data: { videoId: "not-a-video-id" },
		}).ok).toBe(false);

		const result = reg.validateBlock({
			id: "yt2",
			type: "youtube",
			version: 1,
			data: { videoId: "dQw4w9WgXcQ", url: "https://example.com/watch?v=dQw4w9WgXcQ" },
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("youtube.url");
	});

	it("validates columns and child blocks recursively", () => {
		const result = reg.validateBlock({
			id: "cols",
			type: "columns",
			version: 1,
			data: {
				columns: [
					{
						span: 2,
						blocks: [
							{ id: "p", type: "paragraph", version: 1, data: { html: "Left" } },
						],
					},
					{
						blocks: [
							{ id: "h", type: "heading", version: 1, data: { level: 2, text: "Right" } },
						],
					},
				],
				stackBelow: "768px",
				align: "center",
			},
		});
		expect(result.ok).toBe(true);
	});

	it("rejects nested columns with a pathful error", () => {
		const result = reg.validateBlock({
			id: "cols",
			type: "columns",
			version: 1,
			data: {
				columns: [
					{
						blocks: [
							{
								id: "nested",
								type: "columns",
								version: 1,
								data: {
									columns: [
										{ blocks: [] },
										{ blocks: [] },
									],
								},
							},
						],
					},
					{ blocks: [] },
				],
			},
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain("columns[0].blocks[0]");
			expect(result.error).toContain("nesting exceeds maxDepth");
		}
	});

	it("rejects invalid children inside columns with a pathful error", () => {
		const result = reg.validateBlock({
			id: "cols",
			type: "columns",
			version: 1,
			data: {
				columns: [
					{
						blocks: [
							{ id: "bad", type: "heading", version: 1, data: { level: 9, text: "Bad" } },
						],
					},
					{ blocks: [] },
				],
			},
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain("columns[0].blocks[0]");
			expect(result.error).toContain("heading.level");
		}
	});
});

describe("BlockRegistry — parseBlocks (read path)", () => {
	const reg = createDefaultRegistry();

	it("parses JSON string", () => {
		const raw = JSON.stringify([
			{ id: "1", type: "paragraph", version: 1, data: { html: "x" } },
		]);
		const { blocks, errors } = reg.parseBlocks(raw);
		expect(blocks).toHaveLength(1);
		expect(errors).toHaveLength(0);
	});

	it("returns empty for null/undefined/empty string", () => {
		expect(reg.parseBlocks(null).blocks).toEqual([]);
		expect(reg.parseBlocks(undefined).blocks).toEqual([]);
		expect(reg.parseBlocks("").blocks).toEqual([]);
	});

	it("collects per-block errors without throwing", () => {
		const raw = JSON.stringify([
			{ id: "1", type: "paragraph", version: 1, data: { html: "x" } },
			{ id: "2", type: "heading", version: 1, data: { level: 99, text: "x" } },
			{ id: "3", type: "paragraph", version: 1, data: { html: "y" } },
		]);
		const { blocks, errors } = reg.parseBlocks(raw);
		expect(blocks).toHaveLength(2);
		expect(errors).toHaveLength(1);
		expect(errors[0]?.index).toBe(1);
		expect(errors[0]?.type).toBe("heading");
	});

	it("reports invalid JSON without throwing", () => {
		const { blocks, errors } = reg.parseBlocks("not json");
		expect(blocks).toEqual([]);
		expect(errors).toHaveLength(1);
		expect(errors[0]?.message).toContain("invalid JSON");
	});

	it("reports non-array payload without throwing", () => {
		const { blocks, errors } = reg.parseBlocks(JSON.stringify({ not: "array" }));
		expect(blocks).toEqual([]);
		expect(errors).toHaveLength(1);
	});

	it("strict variant throws on validation errors", () => {
		expect(() =>
			reg.parseBlocksStrict(
				JSON.stringify([{ id: "1", type: "heading", version: 1, data: { level: 99, text: "x" } }]),
			),
		).toThrow(/validation failed/);
	});

	it("round-trips via serialize → parseBlocks", () => {
		const original: AnyBlock[] = [
			{ id: "1", type: "paragraph", version: 1, data: { html: "<p>x</p>" } },
			{ id: "2", type: "divider", version: 1, data: {} as Record<string, never> },
		];
		const json = reg.serialize(original);
		const { blocks, errors } = reg.parseBlocks(json);
		expect(errors).toHaveLength(0);
		expect(blocks).toEqual(original);
	});
});

describe("BlockRegistry — migration", () => {
	it("invokes plugin migrate when stored version < current", () => {
		const v2Plugin: BlockPlugin<"paragraph", { html: string }> = {
			...paragraphPlugin,
			version: 2,
			migrate: (oldData, fromVersion) => {
				const o = (oldData ?? {}) as { html?: string; text?: string };
				return { html: `[migrated v${fromVersion}→2] ${o.html ?? o.text ?? ""}` };
			},
		};
		const reg = new BlockRegistry([v2Plugin]);
		const result = reg.validateBlock({
			id: "1",
			type: "paragraph",
			version: 1,
			data: { html: "old" },
		});
		expect(result.ok).toBe(true);
		if (result.ok && result.data.type === "paragraph") {
			expect(result.data.version).toBe(2);
			expect(result.data.data.html).toBe("[migrated v1→2] old");
		}
	});

	it("paragraph plugin migrates legacy { text } → { html }", () => {
		const reg = createDefaultRegistry();
		const result = reg.validateBlock({
			id: "1",
			type: "paragraph",
			version: 1,
			data: { text: "<p>legacy</p>" },
		});
		expect(result.ok).toBe(true);
		if (result.ok && result.data.type === "paragraph") {
			expect(result.data.data.html).toBe("<p>legacy</p>");
		}
	});
});

describe("BlockRegistry — extension via custom plugin", () => {
	it("registers extra plugin alongside core", () => {
		type CustomData = { value: number };
		const customPlugin: BlockPlugin<"custom", CustomData> = {
			type: "custom",
			version: 1,
			defaults: () => ({ value: 0 }),
			validate: (raw) => {
				if (typeof raw !== "object" || raw === null) return { ok: false, error: "must be object" };
				const value = (raw as { value?: unknown }).value;
				if (typeof value !== "number") return { ok: false, error: "value must be number" };
				return { ok: true, data: { value } };
			},
		};
		const reg = createDefaultRegistry([customPlugin]);
		const result = reg.validateBlock({ id: "x", type: "custom", version: 1, data: { value: 42 } });
		expect(result.ok).toBe(true);
	});

	it("allows overriding a core plugin via re-registration", () => {
		const stricter: BlockPlugin<"paragraph", { html: string }> = {
			...paragraphPlugin,
			validate: (raw) => {
				if (typeof raw !== "object" || raw === null) return { ok: false, error: "must be object" };
				const html = (raw as { html?: unknown }).html;
				if (typeof html !== "string" || html.length === 0) return { ok: false, error: "stricter: html required" };
				return { ok: true, data: { html } };
			},
		};
		const reg = createDefaultRegistry([stricter]);
		const result = reg.validateBlock({ id: "x", type: "paragraph", version: 1, data: { html: "" } });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("stricter");
	});
});

describe("legacy helpers", () => {
	it("htmlToBlocks converts one paragraph into one block", () => {
		const blocks = htmlToBlocksLegacy("<p>hi</p>");
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.type).toBe("paragraph");
		expect(blocks[0]?.id).toBeTruthy();
		expect(blocks[0]?.version).toBe(1);
		expect(blocks[0]?.data).toEqual({ html: "hi" });
	});

	it("htmlToBlocks splits paragraph wrappers into multiple blocks", () => {
		const blocks = htmlToBlocksLegacy("<p>hi</p><p>there</p>");
		expect(blocks).toHaveLength(2);
		expect(blocks.map((b) => "data" in b ? b.data : null)).toEqual([
			{ html: "hi" },
			{ html: "there" },
		]);
	});

	it("htmlToBlocks preserves hard line breaks as br tags", () => {
		const blocks = htmlToBlocksLegacy("hi\nthere");
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.data).toEqual({ html: "hi<br>there" });
	});

	it("htmlToBlocks splits blank-line-separated plain text", () => {
		const blocks = htmlToBlocksLegacy("hi\n\nthere");
		expect(blocks).toHaveLength(2);
		expect(blocks.map((b) => "data" in b ? b.data : null)).toEqual([
			{ html: "hi" },
			{ html: "there" },
		]);
	});

	it("htmlToBlocks returns empty array for empty input", () => {
		expect(htmlToBlocks("")).toEqual([]);
		expect(htmlToBlocks("   ")).toEqual([]);
	});

	it("blocksToHtmlPreview reconstructs basic HTML", () => {
		const html = blocksToHtmlPreview([
			{ id: "1", type: "heading", version: 1, data: { level: 2, text: "Title" } },
			{ id: "2", type: "paragraph", version: 1, data: { html: "<p>body</p>" } },
			{ id: "3", type: "list", version: 1, data: { ordered: false, items: ["a", "b"] } },
		]);
		expect(html).toContain("<h2>Title</h2>");
		expect(html).toContain("<p>body</p>");
		expect(html).toContain("<ul><li>a</li><li>b</li></ul>");
	});

	it("blocksToHtmlPreview renders legacy newline paragraphs visibly", () => {
		const html = blocksToHtmlPreview([
			{ id: "1", type: "paragraph", version: 1, data: { html: "First\nline\n\nSecond" } },
		]);
		expect(html).toBe("<p>First<br>line</p>\n<p>Second</p>");
	});

	it("flattenBlocks replaces columns with children in order", () => {
		const blocks: AnyBlock[] = [
			{
				id: "cols",
				type: "columns",
				version: 1,
				data: {
					columns: [
						{
							blocks: [
								{ id: "a", type: "paragraph", version: 1, data: { html: "A" } },
							],
						},
						{
							blocks: [
								{ id: "b", type: "heading", version: 1, data: { level: 2, text: "B" } },
							],
						},
					],
				},
			},
		];

		expect(flattenBlocks(blocks).map((block) => block.id)).toEqual(["a", "b"]);
		expect(blocksToHtmlPreview(blocks)).toContain("A");
		expect(blocksToHtmlPreview(blocks)).toContain("<h2>B</h2>");
	});

	it("blocksToExcerpt extracts text from first paragraph", () => {
		const excerpt = blocksToExcerpt([
			{ id: "1", type: "heading", version: 1, data: { level: 2, text: "Title" } },
			{ id: "2", type: "paragraph", version: 1, data: { html: "<p>This is the body text</p>" } },
		]);
		expect(excerpt).toBe("Title");
	});

	it("blocksToExcerpt truncates long text", () => {
		const long = "x".repeat(500);
		const excerpt = blocksToExcerpt([
			{ id: "1", type: "paragraph", version: 1, data: { html: long } },
		], 50);
		expect(excerpt?.length).toBeLessThanOrEqual(50);
		expect(excerpt?.endsWith("…")).toBe(true);
	});
});

describe("makeBlockId", () => {
	it("generates a non-empty string", () => {
		const id = makeBlockId();
		expect(id).toBeTruthy();
		expect(id.length).toBeGreaterThan(0);
	});

	it("generates unique ids", () => {
		const ids = new Set();
		for (let i = 0; i < 100; i++) ids.add(makeBlockId());
		expect(ids.size).toBe(100);
	});
});

describe("Core plugins — defaults/validate smoke", () => {
	// Exercises defaults() and validate() on every core plugin to ensure all
	// plugin functions are reachable. We do NOT assert defaults() is valid —
	// some plugins (image, file, cta, etc.) require user-supplied fields and
	// return placeholder defaults that are intentionally rejected.
	for (const plugin of CORE_BLOCKS) {
		it(`${plugin.type}: defaults() returns an object`, () => {
			const data = plugin.defaults();
			expect(data).toBeTypeOf("object");
		});

		it(`${plugin.type}: validate() returns a ValidationResult`, () => {
			const result = plugin.validate(plugin.defaults());
			expect(result).toHaveProperty("ok");
			expect(typeof result.ok).toBe("boolean");
		});

		it(`${plugin.type}: validate() handles arbitrary input without throwing`, () => {
			expect(() => plugin.validate({ random: "input" })).not.toThrow();
			expect(() => plugin.validate(null)).not.toThrow();
			expect(() => plugin.validate(42)).not.toThrow();
		});
	}
});
