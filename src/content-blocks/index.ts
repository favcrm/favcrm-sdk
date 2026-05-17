/**
 * Public surface for the content-blocks system.
 *
 * Typical usage (consumer site):
 *   ```ts
 *   import { createDefaultRegistry, type AnyBlock } from '@favcrm/sdk';
 *
 *   const registry = createDefaultRegistry();
 *   const { blocks, errors } = registry.parseBlocks(post.blocks);
 *   if (errors.length) console.warn('block errors:', errors);
 *   // render `blocks` via your renderer registry
 *   ```
 *
 * Typical usage (API write path):
 *   ```ts
 *   const blocks = registry.parseBlocksStrict(input.blocks);  // throws on bad input
 *   await db.update({ blocks: registry.serialize(blocks) });
 *   ```
 *
 * Extending with custom blocks:
 *   ```ts
 *   const registry = createDefaultRegistry([myCustomPlugin]);
 *   ```
 */

export {
	BlockRegistry,
	v as blockValidators,
	type BlockPlugin,
	type ValidationResult,
	type ParseResult,
} from "./registry.js";

export {
	htmlToBlocks,
	blocksToHtmlPreview,
	blocksToExcerpt,
} from "./legacy.js";

export {
	CORE_BLOCKS,
	paragraphPlugin,
	headingPlugin,
	imagePlugin,
	listPlugin,
	quotePlugin,
	codePlugin,
	dividerPlugin,
	embedPlugin,
	htmlPlugin,
	youtubePlugin,
	filePlugin,
	faqPlugin,
	calloutPlugin,
	galleryPlugin,
	ctaPlugin,
	accordionPlugin,
	productRefPlugin,
} from "./core-plugins.js";

import { BlockRegistry, type BlockPlugin } from "./registry.js";
import { CORE_BLOCKS } from "./core-plugins.js";

/**
 * Create a registry pre-loaded with the SDK's built-in plugins.
 * Pass `extras` to register custom block types alongside core.
 *
 * Order matters: a later plugin with the same `type` overrides earlier ones —
 * useful for downstream tweaks of a built-in (e.g. tighter validation).
 */
export function createDefaultRegistry(extras: BlockPlugin[] = []): BlockRegistry {
	return new BlockRegistry([...CORE_BLOCKS, ...extras]);
}

/** Generates a short, URL-safe id for block envelopes. Crypto-strong when available. */
export function makeBlockId(): string {
	const buf = new Uint8Array(8);
	if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
		globalThis.crypto.getRandomValues(buf);
	} else {
		for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
	}
	let out = "";
	const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
	for (let i = 0; i < buf.length; i++) out += alphabet[buf[i]! % alphabet.length];
	return out;
}
