/**
 * Built-in block plugins. These ship with the SDK and are registered by
 * default via `createDefaultRegistry()`.
 *
 * Adding a new core block:
 *  1. Add the type alias to `types/content-blocks.ts`.
 *  2. Add a plugin export here.
 *  3. Append to `CORE_BLOCKS`.
 *  4. Bump SDK version (the AnyBlock union changed).
 *
 * Editor specs (BlockNote etc.) and renderers live in companion packages
 * keyed off these plugins' `type` strings.
 */

import { v, type BlockPlugin, type ValidationResult } from "./registry.js";
import type {
	ParagraphBlock,
	HeadingBlock,
	ImageBlock,
	ListBlock,
	QuoteBlock,
	CodeBlock,
	DividerBlock,
	EmbedBlock,
	FileBlock,
	FaqBlock,
	CalloutBlock,
	GalleryBlock,
	CtaBlock,
	AccordionBlock,
	ProductRefBlock,
} from "../types/content-blocks.js";

// ─── helpers ────────────────────────────────────────────────────────────────

function ok<T>(data: T): ValidationResult<T> {
	return { ok: true, data };
}

function err<T>(message: string): ValidationResult<T> {
	return { ok: false, error: message };
}

// ─── core plugins ───────────────────────────────────────────────────────────

export const paragraphPlugin: BlockPlugin<"paragraph", ParagraphBlock["data"]> = {
	type: "paragraph",
	version: 1,
	defaults: () => ({ html: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("paragraph.data must be object");
		// Legacy migration: { text: string } → { html: string }
		const html = (raw as { html?: unknown; text?: unknown }).html
			?? (raw as { text?: unknown }).text
			?? "";
		if (!v.isString(html)) return err("paragraph.html must be string");
		return ok({ html });
	},
	migrate: (oldData) => {
		const o = (oldData ?? {}) as { html?: string; text?: string };
		return { html: o.html ?? o.text ?? "" };
	},
};

export const headingPlugin: BlockPlugin<"heading", HeadingBlock["data"]> = {
	type: "heading",
	version: 1,
	defaults: () => ({ level: 2, text: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("heading.data must be object");
		const { level, text, anchor } = raw as { level?: unknown; text?: unknown; anchor?: unknown };
		if (!(level === 2 || level === 3 || level === 4)) return err("heading.level must be 2|3|4");
		if (!v.isString(text)) return err("heading.text must be string");
		if (anchor !== undefined && !v.isString(anchor)) return err("heading.anchor must be string when set");
		return ok({ level, text, ...(anchor !== undefined ? { anchor } : {}) });
	},
};

export const imagePlugin: BlockPlugin<"image", ImageBlock["data"]> = {
	type: "image",
	version: 1,
	defaults: () => ({ url: "", alt: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("image.data must be object");
		const { url, alt, caption, width, height } = raw as {
			url?: unknown; alt?: unknown; caption?: unknown; width?: unknown; height?: unknown;
		};
		if (!v.isNonEmptyString(url)) return err("image.url is required");
		if (!v.isString(alt)) return err("image.alt must be string (use '' for decorative)");
		if (caption !== undefined && !v.isString(caption)) return err("image.caption must be string");
		if (width !== undefined && !v.isNumber(width)) return err("image.width must be number");
		if (height !== undefined && !v.isNumber(height)) return err("image.height must be number");
		const out: ImageBlock["data"] = { url, alt };
		if (caption !== undefined) out.caption = caption;
		if (width !== undefined) out.width = width;
		if (height !== undefined) out.height = height;
		return ok(out);
	},
};

export const listPlugin: BlockPlugin<"list", ListBlock["data"]> = {
	type: "list",
	version: 1,
	defaults: () => ({ ordered: false, items: [] }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("list.data must be object");
		const { ordered, items } = raw as { ordered?: unknown; items?: unknown };
		if (!v.isBoolean(ordered)) return err("list.ordered must be boolean");
		if (!v.isArrayOfStrings(items)) return err("list.items must be string[]");
		return ok({ ordered, items });
	},
};

export const quotePlugin: BlockPlugin<"quote", QuoteBlock["data"]> = {
	type: "quote",
	version: 1,
	defaults: () => ({ text: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("quote.data must be object");
		const { text, cite } = raw as { text?: unknown; cite?: unknown };
		if (!v.isString(text)) return err("quote.text must be string");
		if (cite !== undefined && !v.isString(cite)) return err("quote.cite must be string when set");
		return ok({ text, ...(cite !== undefined ? { cite } : {}) });
	},
};

export const codePlugin: BlockPlugin<"code", CodeBlock["data"]> = {
	type: "code",
	version: 1,
	defaults: () => ({ lang: "plaintext", code: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("code.data must be object");
		const { lang, code } = raw as { lang?: unknown; code?: unknown };
		if (!v.isString(lang)) return err("code.lang must be string");
		if (!v.isString(code)) return err("code.code must be string");
		return ok({ lang, code });
	},
};

export const dividerPlugin: BlockPlugin<"divider", DividerBlock["data"]> = {
	type: "divider",
	version: 1,
	defaults: () => ({}) as DividerBlock["data"],
	validate: () => ok({} as DividerBlock["data"]),
};

const EMBED_PROVIDERS = ["youtube", "vimeo", "iframe"] as const;
export const embedPlugin: BlockPlugin<"embed", EmbedBlock["data"]> = {
	type: "embed",
	version: 1,
	defaults: () => ({ provider: "youtube", url: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("embed.data must be object");
		const { provider, url, aspectRatio } = raw as { provider?: unknown; url?: unknown; aspectRatio?: unknown };
		if (!v.isOneOf(provider, EMBED_PROVIDERS)) return err(`embed.provider must be one of ${EMBED_PROVIDERS.join("|")}`);
		if (!v.isNonEmptyString(url)) return err("embed.url is required");
		if (aspectRatio !== undefined && !v.isString(aspectRatio)) return err("embed.aspectRatio must be string when set");
		return ok({ provider, url, ...(aspectRatio !== undefined ? { aspectRatio } : {}) });
	},
};

const FILE_ICONS = ["pdf", "doc", "image", "video", "audio", "generic"] as const;
export const filePlugin: BlockPlugin<"file", FileBlock["data"]> = {
	type: "file",
	version: 1,
	defaults: () => ({ url: "", mimeType: "application/octet-stream", sizeBytes: 0, originalName: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("file.data must be object");
		const { url, mimeType, sizeBytes, originalName, displayName, icon } = raw as {
			url?: unknown; mimeType?: unknown; sizeBytes?: unknown; originalName?: unknown;
			displayName?: unknown; icon?: unknown;
		};
		if (!v.isNonEmptyString(url)) return err("file.url is required");
		if (!v.isNonEmptyString(mimeType)) return err("file.mimeType is required");
		if (!v.isNumber(sizeBytes) || sizeBytes < 0) return err("file.sizeBytes must be non-negative number");
		if (!v.isNonEmptyString(originalName)) return err("file.originalName is required");
		if (displayName !== undefined && !v.isString(displayName)) return err("file.displayName must be string when set");
		if (icon !== undefined && !v.isOneOf(icon, FILE_ICONS)) return err(`file.icon must be one of ${FILE_ICONS.join("|")}`);
		const out: FileBlock["data"] = { url, mimeType, sizeBytes, originalName };
		if (displayName !== undefined) out.displayName = displayName;
		if (icon !== undefined) out.icon = icon;
		return ok(out);
	},
};

export const faqPlugin: BlockPlugin<"faq", FaqBlock["data"]> = {
	type: "faq",
	version: 1,
	defaults: () => ({ items: [] }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("faq.data must be object");
		const { title, items } = raw as { title?: unknown; items?: unknown };
		if (title !== undefined && !v.isString(title)) return err("faq.title must be string when set");
		if (!Array.isArray(items)) return err("faq.items must be array");
		const validatedItems: FaqBlock["data"]["items"] = [];
		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (!v.isObject(it)) return err(`faq.items[${i}] must be object`);
			const { id, question, answer } = it as { id?: unknown; question?: unknown; answer?: unknown };
			if (!v.isNonEmptyString(id)) return err(`faq.items[${i}].id is required`);
			if (!v.isNonEmptyString(question)) return err(`faq.items[${i}].question is required`);
			if (!v.isString(answer)) return err(`faq.items[${i}].answer must be string`);
			validatedItems.push({ id, question, answer });
		}
		return ok({ ...(title !== undefined ? { title } : {}), items: validatedItems });
	},
};

const CALLOUT_TONES = ["info", "success", "warning", "danger", "note"] as const;
export const calloutPlugin: BlockPlugin<"callout", CalloutBlock["data"]> = {
	type: "callout",
	version: 1,
	defaults: () => ({ tone: "info", body: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("callout.data must be object");
		const { tone, title, body } = raw as { tone?: unknown; title?: unknown; body?: unknown };
		if (!v.isOneOf(tone, CALLOUT_TONES)) return err(`callout.tone must be one of ${CALLOUT_TONES.join("|")}`);
		if (title !== undefined && !v.isString(title)) return err("callout.title must be string when set");
		if (!v.isString(body)) return err("callout.body must be string");
		return ok({ tone, ...(title !== undefined ? { title } : {}), body });
	},
};

const GALLERY_LAYOUTS = ["grid", "masonry", "carousel"] as const;
export const galleryPlugin: BlockPlugin<"gallery", GalleryBlock["data"]> = {
	type: "gallery",
	version: 1,
	defaults: () => ({ layout: "grid", images: [] }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("gallery.data must be object");
		const { layout, images } = raw as { layout?: unknown; images?: unknown };
		if (!v.isOneOf(layout, GALLERY_LAYOUTS)) return err(`gallery.layout must be one of ${GALLERY_LAYOUTS.join("|")}`);
		if (!Array.isArray(images)) return err("gallery.images must be array");
		const validatedImages: GalleryBlock["data"]["images"] = [];
		for (let i = 0; i < images.length; i++) {
			const im = images[i];
			if (!v.isObject(im)) return err(`gallery.images[${i}] must be object`);
			const { url, alt, caption } = im as { url?: unknown; alt?: unknown; caption?: unknown };
			if (!v.isNonEmptyString(url)) return err(`gallery.images[${i}].url is required`);
			if (!v.isString(alt)) return err(`gallery.images[${i}].alt must be string`);
			if (caption !== undefined && !v.isString(caption)) return err(`gallery.images[${i}].caption must be string when set`);
			validatedImages.push({ url, alt, ...(caption !== undefined ? { caption } : {}) });
		}
		return ok({ layout, images: validatedImages });
	},
};

const CTA_STYLES = ["primary", "secondary", "ghost"] as const;
export const ctaPlugin: BlockPlugin<"cta", CtaBlock["data"]> = {
	type: "cta",
	version: 1,
	defaults: () => ({ label: "", href: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("cta.data must be object");
		const { label, href, style, openInNewTab } = raw as {
			label?: unknown; href?: unknown; style?: unknown; openInNewTab?: unknown;
		};
		if (!v.isNonEmptyString(label)) return err("cta.label is required");
		if (!v.isNonEmptyString(href)) return err("cta.href is required");
		if (style !== undefined && !v.isOneOf(style, CTA_STYLES)) return err(`cta.style must be one of ${CTA_STYLES.join("|")}`);
		if (openInNewTab !== undefined && !v.isBoolean(openInNewTab)) return err("cta.openInNewTab must be boolean when set");
		const out: CtaBlock["data"] = { label, href };
		if (style !== undefined) out.style = style;
		if (openInNewTab !== undefined) out.openInNewTab = openInNewTab;
		return ok(out);
	},
};

const ACCORDION_SEMANTICS = ["faq", "plain"] as const;
export const accordionPlugin: BlockPlugin<"accordion", AccordionBlock["data"]> = {
	type: "accordion",
	version: 1,
	defaults: () => ({ semantic: "plain", items: [] }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("accordion.data must be object");
		const { semantic, items } = raw as { semantic?: unknown; items?: unknown };
		if (semantic !== undefined && !v.isOneOf(semantic, ACCORDION_SEMANTICS)) {
			return err(`accordion.semantic must be one of ${ACCORDION_SEMANTICS.join("|")}`);
		}
		if (!Array.isArray(items)) return err("accordion.items must be array");
		const validatedItems: AccordionBlock["data"]["items"] = [];
		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (!v.isObject(it)) return err(`accordion.items[${i}] must be object`);
			const { id, title, body } = it as { id?: unknown; title?: unknown; body?: unknown };
			if (!v.isNonEmptyString(id)) return err(`accordion.items[${i}].id is required`);
			if (!v.isNonEmptyString(title)) return err(`accordion.items[${i}].title is required`);
			if (!v.isString(body)) return err(`accordion.items[${i}].body must be string`);
			validatedItems.push({ id, title, body });
		}
		return ok({ ...(semantic !== undefined ? { semantic } : {}), items: validatedItems });
	},
};

const PRODUCT_LAYOUTS = ["card", "inline"] as const;
export const productRefPlugin: BlockPlugin<"product", ProductRefBlock["data"]> = {
	type: "product",
	version: 1,
	defaults: () => ({ slug: "" }),
	validate: (raw) => {
		if (!v.isObject(raw)) return err("product.data must be object");
		const { slug, layout } = raw as { slug?: unknown; layout?: unknown };
		if (!v.isNonEmptyString(slug)) return err("product.slug is required");
		if (layout !== undefined && !v.isOneOf(layout, PRODUCT_LAYOUTS)) return err(`product.layout must be one of ${PRODUCT_LAYOUTS.join("|")}`);
		const out: ProductRefBlock["data"] = { slug };
		if (layout !== undefined) out.layout = layout;
		return ok(out);
	},
};

export const CORE_BLOCKS: BlockPlugin[] = [
	paragraphPlugin,
	headingPlugin,
	imagePlugin,
	listPlugin,
	quotePlugin,
	codePlugin,
	dividerPlugin,
	embedPlugin,
	filePlugin,
	faqPlugin,
	calloutPlugin,
	galleryPlugin,
	ctaPlugin,
	accordionPlugin,
	productRefPlugin,
];
