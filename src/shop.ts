import type { Product, ProductImage, ProductListItem } from './types/shop.js';

export function getEffectivePrice(
  product: Pick<ProductListItem, 'memberPrice' | 'discountPrice' | 'price'>,
): number {
  return product.memberPrice ?? product.discountPrice ?? product.price ?? 0;
}

export function hasDiscount(
  product: Pick<ProductListItem, 'discountPrice' | 'memberPrice' | 'price'>,
): boolean {
  const price = product.price;
  if (price == null) return false;
  return (
    (product.discountPrice != null && product.discountPrice < price) ||
    (product.memberPrice != null && product.memberPrice < price)
  );
}

export function isInStock(stockStatus: string): boolean {
  return stockStatus === 'instock' || stockStatus === 'lowstock';
}

export function getProductLink(product: Pick<ProductListItem, 'slug' | 'id'>): string {
  return product.slug ? `/shop/${product.slug}` : `/shop/${product.id}`;
}

export function getCategoryLabel(
  product: Pick<ProductListItem, 'categoryName' | 'categories'>,
): string {
  return (
    product.categoryName ??
    (product.categories.length > 0 ? product.categories[0].name : '')
  );
}

export function getPrimaryImage(product: Pick<Product, 'images'>): ProductImage | null {
  return product.images.length > 0 ? product.images[0] : null;
}

export function toCartProduct(product: Product): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    slug: product.slug,
    price: product.price,
    discountPrice: product.discountPrice,
    memberPrice: product.memberPrice,
    seoTitle: product.seoTitle,
    status: product.status,
    stockStatus: product.stockStatus,
    categoryName: product.categoryName,
    categories: product.categories,
    isVariable: product.isVariable,
    image: product.images.length > 0 ? product.images[0].src : null,
  };
}
