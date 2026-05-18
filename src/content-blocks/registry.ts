/**
 * Block plugin registry. Defines the runtime contract for a block type:
 * defaults, validation, and version migration. Editor and renderer surfaces
 * layer their own UI on top of these plugins via separate packages.
 *
 * Validators are hand-rolled (no zod dependency) to keep the SDK
 * dependency-free for browser consumers. API services may layer zod schemas
 * on top using the same shape definitions.
 */

import type { AnyBlock, BlockType, ContentBlockBase } from "../types/content-blocks.js";

// ─── Plugin contract ────────────────────────────────────────────────────────

export type ValidationResult<D> =
	| { ok: true; data: D }
	| { ok: false; error: string };

export interface BlockPlugin<K extends string = string, D = unknown> {
	type: K;
	/** Current schema version. Bump when payload shape changes. */
	version: number;
	/** Returns a fresh default payload (used by editor "insert block"). */
	defaults: () => D;
	/**
	 * Validates an unknown payload. Returns the typed payload on success,
	 * or a human-readable error message on failure.
	 */
	validate: (data: unknown) => ValidationResult<D>;
	/**
	 * Declares nested block arrays owned by this block. The registry validates
	 * those children recursively after this plugin's own payload validation.
	 */
	container?: {
		childArrays: (data: unknown) => { path: string; blocks: AnyBlock[] }[];
		/** Number of nested container levels allowed below the top level. */
		maxDepth: number;
	};
	/**
	 * Optional migrator. Called when a stored block's `version` is lower than
	 * the plugin's current `version`. Receives the old data and the version
	 * it was stored at. Must return data conforming to the current version.
	 */
	migrate?: (oldData: unknown, fromVersion: number) => D;
}

// ─── Validation primitives ──────────────────────────────────────────────────

export const v = {
	isObject(x: unknown): x is Record<string, unknown> {
		return typeof x === "object" && x !== null && !Array.isArray(x);
	},
	isString(x: unknown): x is string {
		return typeof x === "string";
	},
	isNonEmptyString(x: unknown): x is string {
		return typeof x === "string" && x.length > 0;
	},
	isNumber(x: unknown): x is number {
		return typeof x === "number" && Number.isFinite(x);
	},
	isBoolean(x: unknown): x is boolean {
		return typeof x === "boolean";
	},
	isArrayOfStrings(x: unknown): x is string[] {
		return Array.isArray(x) && x.every((i) => typeof i === "string");
	},
	isOneOf<T extends string>(x: unknown, options: readonly T[]): x is T {
		return typeof x === "string" && (options as readonly string[]).includes(x);
	},
};

// ─── Registry ───────────────────────────────────────────────────────────────

/**
 * Result of parsing a stored blocks payload.
 * `errors` are non-fatal; problematic blocks are dropped from `blocks`
 * (or carried as `UnknownBlock` for forward-compat). Surface errors in admin
 * UI; never crash the renderer over them.
 */
export interface ParseResult {
	blocks: AnyBlock[];
	errors: { index: number; type?: string; message: string }[];
}

export class BlockRegistry {
	private plugins = new Map<string, BlockPlugin>();

	constructor(plugins: BlockPlugin[] = []) {
		for (const p of plugins) this.register(p);
	}

	/** Register or replace a plugin. Last writer wins (per type). */
	register(plugin: BlockPlugin): void {
		this.plugins.set(plugin.type, plugin);
	}

	get(type: string): BlockPlugin | undefined {
		return this.plugins.get(type);
	}

	has(type: string): boolean {
		return this.plugins.has(type);
	}

	types(): BlockType[] {
		return Array.from(this.plugins.keys()) as BlockType[];
	}

	/**
	 * Validates a single block envelope. Migrates payload up to the plugin's
	 * current version on the way through. Unknown types are passed through as
	 * `UnknownBlock` so reads survive forward compatibility scenarios.
	 */
	validateBlock(raw: unknown): ValidationResult<AnyBlock> {
		return this.validateBlockAt(raw, 0, "");
	}

	private validateBlockAt(raw: unknown, depth: number, path: string): ValidationResult<AnyBlock> {
		if (!v.isObject(raw)) return { ok: false, error: "block must be an object" };
		const { id, type, version, data } = raw as Partial<ContentBlockBase<string, unknown>>;
		if (!v.isNonEmptyString(id)) return { ok: false, error: "block.id is required" };
		if (!v.isNonEmptyString(type)) return { ok: false, error: "block.type is required" };
		if (!v.isNumber(version)) return { ok: false, error: "block.version is required" };

		const plugin = this.plugins.get(type);
		if (!plugin) {
			// Forward compat: keep payload, mark as unknown.
			return {
				ok: true,
				data: { id, type, version, data, __unknown: true } as AnyBlock,
			};
		}

		let payload: unknown = data;
		if (version < plugin.version && plugin.migrate) {
			try {
				payload = plugin.migrate(data, version);
			} catch (err) {
				return { ok: false, error: `migrate ${type} v${version}→v${plugin.version}: ${(err as Error).message}` };
			}
		}

		const validated = plugin.validate(payload);
		if (!validated.ok) return { ok: false, error: `${type}: ${validated.error}` };

		if (plugin.container) {
			if (depth >= plugin.container.maxDepth) {
				return { ok: false, error: `${type}: nesting exceeds maxDepth` };
			}
			for (const childArray of plugin.container.childArrays(validated.data)) {
				for (let i = 0; i < childArray.blocks.length; i++) {
					const childPath = joinPath(path, `${childArray.path}[${i}]`);
					const child = this.validateBlockAt(childArray.blocks[i], depth + 1, childPath);
					if (!child.ok) {
						return { ok: false, error: `${childPath}: ${child.error}` };
					}
				}
			}
		}

		return {
			ok: true,
			data: { id, type, version: plugin.version, data: validated.data } as AnyBlock,
		};
	}

	/**
	 * Parse a stored blocks payload — accepts a JSON string, an array, or
	 * null/undefined. Returns valid blocks plus per-index error report.
	 *
	 * Does not throw. Renderers should always be able to render whatever
	 * comes back, including an empty array.
	 */
	parseBlocks(raw: string | unknown[] | null | undefined): ParseResult {
		const result: ParseResult = { blocks: [], errors: [] };
		if (raw == null) return result;

		let arr: unknown[];
		if (typeof raw === "string") {
			if (raw.trim() === "") return result;
			try {
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) {
					result.errors.push({ index: -1, message: "blocks payload must be an array" });
					return result;
				}
				arr = parsed;
			} catch (err) {
				result.errors.push({ index: -1, message: `invalid JSON: ${(err as Error).message}` });
				return result;
			}
		} else if (Array.isArray(raw)) {
			arr = raw;
		} else {
			result.errors.push({ index: -1, message: "blocks payload must be array or JSON string" });
			return result;
		}

		for (let i = 0; i < arr.length; i++) {
			const v = this.validateBlock(arr[i]);
			if (v.ok) {
				result.blocks.push(v.data);
			} else {
				const t = (arr[i] as { type?: string } | undefined)?.type;
				result.errors.push({ index: i, type: t, message: v.error });
			}
		}
		return result;
	}

	/**
	 * Strict variant of `parseBlocks`. Throws if any block fails validation.
	 * Use on the write path where merchant input must be rejected on error.
	 */
	parseBlocksStrict(raw: string | unknown[] | null | undefined): AnyBlock[] {
		const { blocks, errors } = this.parseBlocks(raw);
		if (errors.length > 0) {
			const summary = errors.map((e) => `[${e.index}] ${e.message}`).join("; ");
			throw new Error(`blocks validation failed: ${summary}`);
		}
		return blocks;
	}

	/** Serialize for storage. Round-trip safe. */
	serialize(blocks: AnyBlock[]): string {
		return JSON.stringify(blocks);
	}
}

function joinPath(parent: string, child: string): string {
	return parent ? `${parent}.${child}` : child;
}
