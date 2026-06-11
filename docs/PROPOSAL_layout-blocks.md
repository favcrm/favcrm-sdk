# Proposal: Layout Blocks (row / column) for the Content-Block System

**Status:** Draft for backend + SDK review
**Author:** generated from a consumer-template (`fav-blog`) need
**Affects:** `@favcrm/sdk` content-blocks, merchant API write/read paths, CMS
editor, all consumer renderers (`fav-blog`, `fav-storefront`, `fav-beauty`).

---

## 1. Summary

Today `BlogPost.blocks` / `CmsPage.blocks` store a **flat** `AnyBlock[]`. There
is no way to place two blocks side by side. Marketing/landing CMS pages want a
multi-column row (e.g. text + image, or a 3-up feature strip).

This proposes a single new container block — **`columns`** — and the SDK +
backend + editor changes to support it. It is deliberately scoped: **one level
of nesting, no columns inside columns.**

> Note: a blog *essay* should stay single-column for readability. This block is
> primarily for CMS *pages*. Ship it behind the page editor first.

---

## 2. Decision

Adopt a **nested container block** (`columns` holds child block arrays),
**not** flat sentinel markers. Bound nesting to one level. Ship a
`flattenBlocks()` helper so non-layout-aware consumers degrade cleanly.

Rationale and the rejected alternative are in §10.

---

## 3. Schema

Add to `src/types/content-blocks.ts`:

```ts
/**
 * Layout container. Places child blocks in side-by-side columns.
 * One level deep only — a column's blocks MUST NOT contain another
 * `columns` block (enforced by the validator).
 */
export type ColumnsBlock = ContentBlockBase<'columns', {
  /** 2–4 columns. */
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
```

- Add `ColumnsBlock` to the `AnyBlock` union.
- `BlockType` and `DataOf<'columns'>` derive automatically.
- The envelope (`id`, `type`, `version`, `data`) is unchanged — `columns` is a
  normal block whose `data` happens to hold child block arrays.

**Block id uniqueness:** ids must be unique across the *entire tree*, not just
the top level. `makeBlockId()` is already random; document the requirement.

---

## 4. SDK changes (`@favcrm/sdk`)

### 4.1 Declare containers to the registry

`BlockPlugin` cannot recurse — plugins have no registry reference. Add an
optional **container descriptor** so the registry can recurse generically
(future-proof for any container block):

```ts
// registry.ts — BlockPlugin
export interface BlockPlugin<...> {
  // ...existing fields...
  /**
   * Declares which `data` paths hold nested `AnyBlock[]`. When set, the
   * registry validates children recursively. `maxDepth` caps nesting.
   */
  container?: {
    /** Function returning every child-block array in this block's data. */
    childArrays: (data: unknown) => AnyBlock[][];
    maxDepth: number; // columns → 1
  };
}
```

### 4.2 Recursive validation

`BlockRegistry.validateBlock` (registry.ts) gains a depth parameter:

- After the plugin's own `validate` succeeds, if `plugin.container` is set,
  call `childArrays(data)` and recurse `validateBlock(child, depth + 1)` on
  every child.
- If `depth > plugin.container.maxDepth` → fail with
  `"columns: nesting exceeds maxDepth"`. This is how "no columns in columns"
  is enforced.
- Children that fail validation propagate an error with a **path** (e.g.
  `columns[0].blocks[2]`) so `parseBlocks` error reporting stays useful.
- `parseBlocks` / `parseBlocksStrict` / `serialize` need no signature change —
  recursion is internal.

### 4.3 The `columns` plugin

Add `columnsPlugin` to `core-plugins.ts`, export it, append to `CORE_BLOCKS`:

- `validate`: shape-check `columns` is an array of length 2–4, each item has a
  `blocks` array, `span` (if present) is a positive number, `stackBelow` is a
  CSS length, `align` is in the enum. **Does not** validate children — the
  registry does that via the `container` descriptor.
- `container.childArrays`: `(data) => data.columns.map(c => c.blocks)`.
- `container.maxDepth`: `1`.
- `migrate`: none yet (version 1).

### 4.4 New helper: `flattenBlocks`

In `content-blocks/index.ts` (or `legacy.ts`):

```ts
/**
 * Depth-first flatten of a block tree into a linear AnyBlock[]. Container
 * blocks are replaced by their children in order. Use this in renderers and
 * tools that do not understand layout (excerpt, llms.txt, plain readers).
 */
export function flattenBlocks(blocks: AnyBlock[]): AnyBlock[];
```

### 4.5 Update existing block tooling to recurse

These currently assume a flat array and will silently ignore content inside
`columns` unless updated:

- `blocksToExcerpt`, `blocksToHtmlPreview` (`legacy.ts`) — flatten first.
- `htmlToBlocks` — unaffected (only ever produces flat blocks).
- Any server-side SEO/excerpt derivation on the API.

### 4.6 Version bump

The `AnyBlock` union changed → **minor SDK bump** (e.g. `1.3.0 → 1.4.0`), per
the rule already documented at the top of `core-plugins.ts`. Note it in
`CHANGELOG.md` and `docs/CONTENT_BLOCKS.md`.

---

## 5. Validation rules (summary)

| Rule | Failure message |
|------|-----------------|
| `data.columns` is an array, length 2–4 | `columns: expected 2–4 columns` |
| each column has `blocks: AnyBlock[]` | `columns[i]: blocks must be an array` |
| `span` (if set) is a positive finite number | `columns[i]: span must be > 0` |
| `stackBelow` (if set) is a CSS length | `columns: invalid stackBelow` |
| `align` (if set) ∈ enum | `columns: invalid align` |
| no `columns` block among descendants | `columns: nesting exceeds maxDepth` |
| every child block validates | child error, with path |

---

## 6. Backend / API changes

- **DB:** none. `posts.blocks` / `cms_pages.blocks` remain a JSON string. The
  nested data serializes inside the same column. No migration.
- **Write path:** the API already calls `registry.parseBlocksStrict()` before
  persisting. Once the registry recurses (§4.2), nested validation is automatic
  — **but the API must be on the SDK version that ships `columns`.** Bump the
  API's `@favcrm/sdk` dependency in the same release.
- **Read path:** unchanged — `blocks` is returned verbatim.
- **SEO / excerpt:** if the API derives `seoDescription` / previews server-side,
  switch that code to `flattenBlocks()` first (§4.5).
- **`/blog/[slug]/llms.txt` and similar agent views:** flatten before
  rendering Markdown.

---

## 7. CMS editor implications (largest cost)

This is the heaviest part of the work and should gate the rollout:

- The editor must let an author insert a `columns` block, choose 2–4 columns,
  and drag blocks **into** a column.
- Drag-and-drop, block reordering, and the block-insert menu must operate
  **within** a column as well as at the top level.
- Disable inserting a `columns` block while already inside a column (depth 1).
- Serialize to the nested shape in §3.
- Recommend shipping the editor behind the **page** editor only at first;
  enable for posts later (or never, if essays stay single-column).

---

## 8. Renderer contract for consumer templates

Document in `docs/CONTENT_BLOCKS.md`:

> Renderers fall into two classes.
>
> **Layout-aware** (page renderers): handle `type === 'columns'` by rendering a
> CSS grid/flex row, recursing into each column's `blocks`.
>
> **Layout-agnostic** (excerpt, llms.txt, minimal/legacy renderers): call
> `flattenBlocks(blocks)` once, then render the linear result. Columned content
> appears stacked — never lost.

Consumer templates (`fav-blog`, `fav-storefront`, `fav-beauty`) each need a
small update: either render `columns` or call `flattenBlocks` first. Until they
do, an un-updated renderer hits `columns` as an `UnknownBlock` and **skips it,
dropping the nested content** — see §10 for why that risk is acceptable.

---

## 9. Phasing

1. **SDK** — types, `columnsPlugin`, registry recursion, `flattenBlocks`,
   update `legacy.ts` helpers, version bump, tests. Shippable on its own;
   nothing emits `columns` yet.
2. **API** — bump SDK dep; switch server-side excerpt/SEO to `flattenBlocks`.
3. **Consumer templates** — add `flattenBlocks` fallback (cheap) so they
   degrade gracefully even before they render columns.
4. **CMS editor** — column insertion + nested drag-drop. This unlocks the
   feature for merchants.
5. **Layout-aware rendering** in templates that want true columns.

Steps 1–3 are safe to land immediately; 4 is the real effort.

---

## 10. Rejected alternative: flat sentinel markers

Considered: keep the array flat, add `columns-start` / `column-break` /
`columns-end` marker blocks; the renderer groups blocks between markers.

**Pro:** the array stays flat — `parseBlocks`/`serialize` untouched — and an
un-updated renderer that skips the unknown markers still renders all the inner
content **linearly** (no content loss).

**Con (decisive):** balance is unenforceable in a flat list. Unbalanced or
interleaved markers, markers split across an edit, copy-paste of a partial
range — all produce invalid states the type system cannot prevent. The editor
must constantly repair marker pairs. Validation becomes a stateful scan, not a
per-block check. This breaks the system's core invariant: *each block is
independently valid and independently versioned.*

**Why the nested model's downside is acceptable:** the one real cost of nesting
is that an *un-updated* renderer treats `columns` as `UnknownBlock` and drops
the nested content. Mitigations:

- All official renderers live in this monorepo and ship together with the SDK
  bump — they are never "un-updated" in practice.
- `flattenBlocks()` is a one-line upgrade for any forked/third-party consumer,
  and step 3 lands it everywhere before any `columns` block can be authored.
- `columns` only appears once the **editor** can emit it (step 4) — by then
  every consumer has had the fallback for two releases.

A correct, type-enforced data model with a known, mitigated degradation path
beats a fragile flat model whose failure modes are unbounded.

---

## 11. Open questions

- Should `column.span` be a flex ratio (`1`, `2`) or a fixed fraction
  (`"33%"`)? Ratio is recommended — simpler, responsive.
- Min/max columns: proposal says 2–4. Confirm with design.
- Do we also want a non-visual `group` block (semantic grouping, single
  column) — e.g. for shared background or anchored sections? Out of scope here;
  if wanted it reuses the exact same `container` registry machinery with
  `maxDepth` allowing deeper nesting. Decide separately.
- Nested-id collision: should `parseBlocks` reject duplicate ids across the
  tree, or just document the requirement? Recommend a soft warning in the
  error report, not a hard fail.
