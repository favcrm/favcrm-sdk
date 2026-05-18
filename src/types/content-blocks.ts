/**
 * Content blocks — typed discriminated union used by CMS posts, pages, and any
 * other long-form content surface. Stored as a JSON-stringified array on
 * `BlogPost.blocks`. Each block is independently versioned so individual block
 * schemas can evolve without coordinated migrations.
 *
 * Renderer contract: consumers iterate `AnyBlock[]` and dispatch by `type`.
 * Unknown types must render to a no-op (forward compatibility) — see
 * `parseBlocks` for the read-time guarantees.
 */

export interface ContentBlockBase<K extends string, D> {
	/** Stable id (nanoid). Survives reorder; lets renderers key lists. */
	id: string;
	/** Discriminator. */
	type: K;
	/** Per-block schema version. Migrators promote old payloads on read. */
	version: number;
	/** Payload — shape determined by `type`. */
	data: D;
}

// ─── Core blocks ────────────────────────────────────────────────────────────

export type ParagraphBlock = ContentBlockBase<'paragraph', {
	/** Inline-rich HTML (no block-level wrappers). */
	html: string;
}>;

export type HeadingBlock = ContentBlockBase<'heading', {
	level: 1 | 2 | 3 | 4;
	text: string;
	/** Optional URL fragment id. Auto-derived from text when absent. */
	anchor?: string;
}>;

export type ImageBlock = ContentBlockBase<'image', {
	url: string;
	alt: string;
	caption?: string;
	width?: number;
	height?: number;
}>;

export type ListBlock = ContentBlockBase<'list', {
	ordered: boolean;
	items: string[];
}>;

export type QuoteBlock = ContentBlockBase<'quote', {
	text: string;
	cite?: string;
}>;

export type CodeBlock = ContentBlockBase<'code', {
	lang: string;
	code: string;
}>;

export type DividerBlock = ContentBlockBase<'divider', Record<string, never>>;

export type EmbedBlock = ContentBlockBase<'embed', {
	provider: 'youtube' | 'vimeo' | 'iframe';
	url: string;
	/** CSS aspect-ratio token, e.g. "16/9". */
	aspectRatio?: string;
}>;

export type HtmlBlock = ContentBlockBase<'html', {
	/** Sanitized HTML fragment. Active content is rejected by core validators. */
	html: string;
}>;

export type YoutubeBlock = ContentBlockBase<'youtube', {
	/** Canonical 11-character YouTube video id. */
	videoId: string;
	/** Optional original YouTube URL for editor provenance. */
	url?: string;
	title?: string;
	startSeconds?: number;
	/** CSS aspect-ratio token, e.g. "16/9". */
	aspectRatio?: string;
}>;

// ─── Extension blocks ──────────────────────────────────────────────────────

export type FileBlock = ContentBlockBase<'file', {
	url: string;
	mimeType: string;
	sizeBytes: number;
	originalName: string;
	displayName?: string;
	/** Server-derived from mimeType; renderer hint. */
	icon?: 'pdf' | 'doc' | 'image' | 'video' | 'audio' | 'generic';
}>;

export type FaqBlock = ContentBlockBase<'faq', {
	title?: string;
	items: { id: string; question: string; answer: string }[];
}>;

export type CalloutBlock = ContentBlockBase<'callout', {
	tone: 'info' | 'success' | 'warning' | 'danger' | 'note';
	title?: string;
	body: string;
}>;

export type GalleryBlock = ContentBlockBase<'gallery', {
	layout: 'grid' | 'masonry' | 'carousel';
	images: { url: string; alt: string; caption?: string }[];
}>;

export type CtaBlock = ContentBlockBase<'cta', {
	label: string;
	href: string;
	style?: 'primary' | 'secondary' | 'ghost';
	openInNewTab?: boolean;
}>;

export type AccordionBlock = ContentBlockBase<'accordion', {
	/** When 'faq', renderers should emit FAQPage JSON-LD. */
	semantic?: 'faq' | 'plain';
	items: { id: string; title: string; body: string }[];
}>;

export type ProductRefBlock = ContentBlockBase<'product', {
	slug: string;
	layout?: 'card' | 'inline';
}>;

/**
 * Layout container. Places child blocks in side-by-side columns.
 * One level deep only: child blocks must not contain another `columns` block.
 */
export type ColumnsBlock = ContentBlockBase<'columns', {
	columns: {
		/** Flex ratio for this column. Defaults to equal split. */
		span?: number;
		/** Child blocks. Any core block except `columns`. */
		blocks: AnyBlock[];
	}[];
	/** Stack to one column below this viewport width. Default "768px". */
	stackBelow?: string;
	/** Vertical alignment of columns. Default "start". */
	align?: 'start' | 'center' | 'stretch';
}>;

// ─── Forward-compat fallback ────────────────────────────────────────────────

/**
 * Block whose `type` is not registered. Carried through reads so older
 * consumers don't strip merchant content; renderers should skip with a warning.
 */
export type UnknownBlock = ContentBlockBase<string, unknown> & { __unknown: true };

export type AnyBlock =
	| ParagraphBlock
	| HeadingBlock
	| ImageBlock
	| ListBlock
	| QuoteBlock
	| CodeBlock
	| DividerBlock
	| EmbedBlock
	| HtmlBlock
	| YoutubeBlock
	| FileBlock
	| FaqBlock
	| CalloutBlock
	| GalleryBlock
	| CtaBlock
	| AccordionBlock
	| ProductRefBlock
	| ColumnsBlock
	| UnknownBlock;

/** Discriminator map. Useful for renderer registries: `Record<BlockType, Component>`. */
export type BlockType = AnyBlock['type'];

/**
 * Helper: extract the data payload type for a given block kind.
 * @example DataOf<'faq'> // => { title?: string; items: {...}[] }
 */
export type DataOf<K extends BlockType> = Extract<AnyBlock, { type: K }>['data'];
