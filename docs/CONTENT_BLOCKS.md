# Content Blocks Architecture

Generic block-based content system for any CMS-managed surface (blog posts,
pages, treatment dossiers, landing pages). Designed for merchant-managed
content where the editor produces a structured block array and consumer sites
render via a renderer registry.

## TL;DR

- Storage: JSON-stringified array on `BlogPost.blocks` (existing column).
- Wire shape: `{ id, type, version, data }` envelope per block.
- Validation: hand-rolled in SDK (zero deps for browser bundles); zod mirror
  in API (strict, write-path enforcement); lenient parse on read.
- Plugins: blocks register `{ defaults, validate, migrate }`. Editor specs
  and renderers live in companion packages keyed by `type`.

## Why this shape

| Requirement                                     | Solution                                  |
| ------------------------------------------------ | ----------------------------------------- |
| Merchant edits without devs                      | Storage decoupled from rendering        |
| Block schema evolves without big-bang migrations | Per-block `version` + lazy migrators on read |
| Multiple consumer sites (Svelte, React, …)       | Registry-driven renderers per site      |
| New block types ship without breaking old data   | Strict on write, lenient on read (`UnknownBlock`) |
| Editor swap (TipTap → BlockNote) without data loss | Editor JSON ≠ storage JSON; transform at boundaries |

## Layers

```
┌─────────────────────────────────────────────────┐
│  merchant-portal (React)                        │
│   - BlogPostForm uses BlockNote (or TipTap)    │
│   - Form data: AnyBlock[] (envelope shape)      │
│   - Sends to api via SDK / fetch                │
└────────────────┬────────────────────────────────┘
                 │ POST /cms/posts { blocks: AnyBlock[] }
                 ▼
┌─────────────────────────────────────────────────┐
│  api (Cloudflare Workers / Hono)                │
│   - blocksArraySchema (zod, strict)             │
│   - parses + validates + JSON.stringify         │
│   - autoExcerpt reads first paragraph/heading   │
│   - Stores blocks: string in D1                 │
└────────────────┬────────────────────────────────┘
                 │ GET /blog/{slug}
                 ▼
┌─────────────────────────────────────────────────┐
│  consumer site (skin-center, future sites)      │
│   - createDefaultRegistry().parseBlocks(raw)    │
│   - Iterates AnyBlock[]                         │
│   - Renderer registry: type → component         │
└─────────────────────────────────────────────────┘
```

## Block envelope

Every block has the same envelope:

```ts
interface ContentBlockBase<K, D> {
  id: string;       // stable nanoid/uuid; survives reorder
  type: K;          // discriminator
  version: number;  // per-block schema version
  data: D;          // payload, shape determined by type
}
```

Block-specific data lives in `data`. The envelope is invariant.

## Built-in block types

| Type          | Purpose                       | Notes                                        |
| ------------- | ----------------------------- | -------------------------------------------- |
| `paragraph`   | Rich-text paragraph           | `data.html`, migrates from legacy `data.text` |
| `heading`     | Section heading               | `level: 1 \| 2 \| 3 \| 4`, optional anchor  |
| `image`       | Inline image                  | Required `alt`; use `''` for decorative     |
| `list`        | Ordered/unordered list        | `items: string[]`                            |
| `quote`       | Blockquote                    | Optional `cite`                              |
| `code`        | Code block                    | `lang` for highlighter                       |
| `divider`     | Horizontal rule               | No payload                                   |
| `embed`       | YouTube/Vimeo/iframe          | Provider enum                                |
| `html`        | Sanitized HTML fragment       | No active content; use dedicated embed blocks |
| `youtube`     | YouTube video                 | Stores canonical `videoId`; render with nocookie embed |
| `file`        | File attachment / download    | URL + mime + size + originalName             |
| `faq`         | FAQ list                      | Emits `FAQPage` JSON-LD when rendered        |
| `callout`     | Boxed note (info/warn/etc.)   | Tone enum                                    |
| `gallery`     | Multi-image grid              | Layout enum (`grid \| masonry \| carousel`) |
| `cta`         | Call-to-action button         | Style enum                                   |
| `accordion`   | Generic collapsible list      | `semantic: 'faq'` triggers FAQPage JSON-LD   |
| `product`     | Reference to a Product by slug | Server resolves on render                    |

## Adding a new block type

1. **Type union** — add to `src/types/content-blocks.ts`:
   ```ts
   export type MyBlock = ContentBlockBase<'my-block', { ... }>;
   // append to AnyBlock union
   ```

2. **Plugin** — add to `src/content-blocks/core-plugins.ts`:
   ```ts
   export const myBlockPlugin: BlockPlugin<'my-block', MyBlock['data']> = {
     type: 'my-block',
     version: 1,
     defaults: () => ({ ... }),
     validate: (raw) => { /* hand-rolled, use `v` helpers */ },
     migrate: (oldData, fromVersion) => { /* optional */ },
   };
   // append to CORE_BLOCKS
   ```

3. **API schema mirror** — add to
   `apps/api/src/schemas/content-blocks.ts`:
   ```ts
   const myBlockSchema = z.object({
     ...blockEnvelope,
     type: z.literal('my-block'),
     data: z.object({ /* match SDK validate */ }),
   });
   // add to anyBlockSchema discriminated union
   ```

4. **Tests** — add SDK plugin tests + API schema tests.

5. **Renderer** — add Svelte (or React) component in your renderer package.

6. **Editor spec** — add BlockNote (or your editor) block spec for merchants.

7. **Bump SDK version** — the `AnyBlock` union changed.

## Schema versioning & migration

When a block's payload shape changes:

1. Bump the plugin's `version`.
2. Implement `migrate(oldData, fromVersion) => newData`.
3. The registry calls `migrate` on read whenever stored `version <
   plugin.version`. Records are NOT updated in place — migrations run on
   every read until the next write touches the record.
4. After migration, validators run against the new shape.

Example: paragraph plugin already migrates legacy `{ text }` to `{ html }`.

## Forward compatibility

If a stored block's `type` is not registered (e.g. older API reading a block
created by a newer client), the registry returns it as `UnknownBlock` rather
than dropping it. Renderers must skip unknown blocks (with a warning in
admin UIs). Strict variants (`parseBlocksStrict`, API zod) reject unknowns
on the write path.

## Files & FAQ — designed-in support

Both blocks are first-class:

- **File** — server uploads via `media-bridge-server` (existing infra).
  Two-phase save: upload → URL → write block. Block stores `{ url,
  mimeType, sizeBytes, originalName, displayName?, icon? }`. Quota policy
  lives in API, not block layer.

- **FAQ** — first-class block + a more general `accordion` block with
  `semantic: 'faq'`. Pick **one** before merchants build content;
  recommendation: keep both (FAQ for unambiguous SEO intent; accordion for
  generic collapsibles like menu sections, tier comparisons).

## HTML & YouTube best practice

- Prefer semantic blocks (`paragraph`, `heading`, `image`, `cta`, `youtube`)
  over raw HTML. They are easier to render consistently, sanitize, index, and
  migrate.
- Use `youtube` for videos instead of pasting iframe HTML. Store `videoId`
  plus optional `title`, `startSeconds`, and `aspectRatio`; render as
  `https://www.youtube-nocookie.com/embed/{videoId}` and set iframe
  `title`, `loading="lazy"`, `allowfullscreen`, and a restrictive `allow`
  list.
- Keep `embed` for backward compatibility and non-core providers. New YouTube
  content should use `youtube`.
- Use `html` only for trusted, sanitized fragments that cannot be expressed
  as structured blocks. The core validator rejects active content such as
  scripts, iframes, inline event handlers, and `javascript:` URLs.
- Frontend renderers should still sanitize `html` at render time with the
  app's sanitizer. API/SDK validation is a contract guard, not a replacement
  for output sanitization.

## Editor architecture (shipped)

Two-tier authoring surface in `merchant-portal`:

1. **BlockNote canvas** (`BlockEditor.tsx`) — narrative content
   (paragraph, heading, list, quote, code, image, divider, file). Slash
   menu drives insertion, drag-handle reorders. Bridge in
   `utils/blocknote-bridge.ts` transforms BlockNote document JSON ↔
   `AnyBlock` envelope per block. **BlockNote's internal JSON is never
   persisted** — only `AnyBlock[]` hits the API.

2. **Extension-block panel** (`ExtensionBlockPanel.tsx`) — typed forms
   for FAQ, Callout, CTA, Accordion, Embed, Gallery, Product. These
   live outside the inline canvas because their UX (item repeaters,
   enum pickers) doesn't translate to inline blocks. Append after
   narrative content on save.

Renderer surface lives in each consumer site under `src/lib/blocks/`
(Svelte) — see `containers/azure-skin-center/src/lib/blocks/` for the
reference implementation. `BlockRenderer.svelte` dispatches by `type`
to per-type components; unknown types are silently skipped (forward
compat).

## File upload

`POST /cms/posts/:id/upload-media` returns full file metadata sized
for the `file` block:

```json
{
  "url": "...",
  "mimeType": "...",
  "sizeBytes": 12345,
  "originalName": "guide.pdf",
  "icon": "pdf"
}
```

Policy in `apps/api/src/services/file-upload.policy.ts`:
- 50MB cap (configurable)
- Allowlist: `image/*`, `video/*`, `audio/*`, PDF, Office docs,
  text/plain, CSV, ZIP
- `deriveFileIcon(mime)` returns the renderer hint

Two-phase save flow on the editor side: upload → URL → write block.

Custom post-type fields use the same two-phase idea. A `url` field can set
`options.uploadable = true`; merchant editors then upload a file and the
field still stores the resulting URL string in `post.meta[fieldKey]`.

## Cross-package contract sync

The SDK validators (hand-rolled) and API validators (zod) are **two
implementations of the same contract**. To prevent drift:

- Co-locate the contract definition in the SDK; comment in the API schema
  file makes the mirroring obligation explicit.
- Each new block: PR touches both files in the same commit.
- Tests on each side cover the same shapes (plugin tests in SDK, schema
  tests in API).

If this drift becomes painful, options:

1. Add `@favcrm/sdk` to api workspace and call `parseBlocksStrict` directly
   — single source of truth, but ties API to SDK release cadence.
2. Codegen zod from SDK plugins — heavier but eliminates manual sync.

Defer those until drift causes a real bug.

## SDK API surface

```ts
import {
  // Types
  AnyBlock, BlockType, DataOf,
  ParagraphBlock, HeadingBlock, /* … */ FaqBlock, FileBlock,

  // Registry
  BlockRegistry, createDefaultRegistry, makeBlockId,
  blockValidators,           // primitive type guards (`v`)

  // Plugins (re-exported for extension/override)
  paragraphPlugin, headingPlugin, /* … */

  // Legacy adapters
  htmlToBlocks, blocksToHtmlPreview, blocksToExcerpt,
} from '@favcrm/sdk';

const registry = createDefaultRegistry();

// Read path — never throws
const { blocks, errors } = registry.parseBlocks(post.blocks);

// Write path — throws on invalid input
const validated = registry.parseBlocksStrict(input);
await db.update({ blocks: registry.serialize(validated) });

// Custom block
const registry = createDefaultRegistry([myCustomPlugin]);
```
