/**
 * Custom post-type field schemas + value shapes.
 *
 * Custom post types let merchants define their own content schemas —
 * e.g. "Recipe" with `cookTime` (number), `ingredients` (multiselect),
 * `photos` (gallery). Field values are stored on `BlogPost.meta` keyed
 * by `PostTypeField.key`.
 *
 * These types mirror the v6 API shape returned by
 * `/v6/merchant/cms/post-types/:id/fields`.
 */

/** All field types supported by the CMS. */
export const POST_TYPE_FIELD_TYPES = [
  "text",
  "textarea",
  "richtext",
  "number",
  "boolean",
  "date",
  "datetime",
  "select",
  "multiselect",
  "url",
  "email",
  "image",
  "file",
  "gallery",
  "attachments",
] as const;

export type PostTypeFieldType = (typeof POST_TYPE_FIELD_TYPES)[number];

/** Single image in a `gallery` field's value array. */
export interface GalleryItem {
  url: string;
  alt?: string;
  caption?: string;
  /** Captured at upload time; not edited by users. */
  size?: number;
  mimeType?: string;
}

/** Single file in an `attachments` field's value array. */
export interface AttachmentItem {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

/** Choice for `select` / `multiselect` field types. */
export interface PostTypeFieldChoice {
  label: string;
  value: string;
}

/** Parsed `options` for a field. Shape depends on the field type. */
export interface PostTypeFieldOptions {
  choices?: PostTypeFieldChoice[];
  [key: string]: unknown;
}

/** Single field definition on a post type. */
export interface PostTypeField {
  id: string;
  postTypeId: string;
  key: string;
  label: string;
  fieldType: PostTypeFieldType;
  required: boolean;
  options: PostTypeFieldOptions | null;
  helpText: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Post type definition (built-in: `blog_post`, `page`; or custom). */
export interface PostType {
  id: string;
  slug: string;
  label: string;
  labelPlural: string;
  icon: string | null;
  isBuiltIn: boolean;
  supportsCategories: boolean;
  supportsFeaturedImage: boolean;
  supportsNesting: boolean;
  supportsExcerpt: boolean;
  supportsBlocks: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Type guard for `gallery` field values. Returns true if the value looks
 * like an array of GalleryItem records (each with a `url` string).
 */
export function isGalleryFieldValue(value: unknown): value is GalleryItem[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as { url?: unknown }).url === "string",
  );
}

/**
 * Type guard for `attachments` field values. Returns true if the value
 * looks like an array of AttachmentItem records (each with `url` + `name`).
 */
export function isAttachmentFieldValue(
  value: unknown,
): value is AttachmentItem[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as { url?: unknown }).url === "string" &&
      typeof (item as { name?: unknown }).name === "string",
  );
}
