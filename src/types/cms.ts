export interface CmsBlock {
  type: string;
  data?: Record<string, unknown>;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  blocks: string | null;
  excerpt: string | null;
  status: string;
  visibility: string;
  featuredImage: string | null;
  parentId: string | null;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
