/** Blog category for organization. */
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

/** Blog post summary for list views. */
export interface BlogPostListItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  visibility: string;
  featuredImage: string | null;
  authorId: string | null;
  parentId: string | null;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categories: BlogCategory[];
}

/** Full blog post with block content and SEO fields. */
export interface BlogPost extends BlogPostListItem {
  companyId: string;
  blocks: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /**
   * Custom-field values keyed by `postTypeFields.key`. Shape varies by the
   * field's type — see `./post-types.ts` for the array-shaped values
   * (`gallery`, `attachments`); other fields are strings/numbers/booleans.
   * `null` when the post type defines no custom fields.
   */
  meta: Record<string, unknown> | null;
}
