export interface ProductReview {
  id: string;
  productId: number;
  authorName: string;
  rating: number;
  title: string | null;
  content: string | null;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  reviewCount: number;
}

export interface CreateReviewRequest {
  token: string;
  rating: number;
  title?: string;
  content?: string;
}

export interface ReviewContext {
  product: {
    id: number;
    name: string;
    slug: string | null;
    image: string | null;
  };
  authorName: string;
  alreadyReviewed: boolean;
}
