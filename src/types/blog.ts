/** Blog post author summary. */
export interface BlogAuthor {
  id: number;
  firstName: string;
  lastName: string;
}

/** Blog category for organization. */
export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

/** Blog tag for flexible categorization. */
export interface BlogTag {
  id: number;
  name: string;
  slug: string;
}

/** Blog post summary for list views. */
export interface BlogPostListItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
  viewCount: number;
  author: BlogAuthor;
  categories: BlogCategory[];
  tags: BlogTag[];
  createdAt: string;
  updatedAt: string;
}

/** Full blog post with content and SEO fields. */
export interface BlogPost extends BlogPostListItem {
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
}
