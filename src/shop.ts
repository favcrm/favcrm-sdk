import type { Product, ProductImage, ProductListItem, ProductVariation } from './types/shop.js';

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

export interface SearchMatchSegment {
  text: string;
  matched: boolean;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function matchesNormalized(
  product: Pick<ProductListItem, 'name' | 'description'>,
  normalised: string,
): boolean {
  const name = product.name.toLowerCase();
  const desc = (product.description ?? '').toLowerCase();
  return name.includes(normalised) || desc.includes(normalised);
}

export function matchesSearchQuery(
  product: Pick<ProductListItem, 'name' | 'description'>,
  query: string,
): boolean {
  const normalised = normalizeSearchQuery(query);
  if (normalised === '') return true;
  return matchesNormalized(product, normalised);
}

export function filterProducts<T extends Pick<ProductListItem, 'name' | 'description'>>(
  products: T[],
  query: string,
): T[] {
  const normalised = normalizeSearchQuery(query);
  if (normalised === '') return products;
  return products.filter((p) => matchesNormalized(p, normalised));
}

export function filterProductsByCategory<T extends Pick<ProductListItem, 'categories'>>(
  products: T[],
  categorySlug: string,
): T[] {
  if (!categorySlug) return products;
  return products.filter((p) =>
    p.categories.some((c) => c.slug === categorySlug),
  );
}

export function highlightSearchMatch(
  text: string,
  query: string,
): SearchMatchSegment[] {
  const normalised = normalizeSearchQuery(query);
  if (normalised === '' || text === '') return [{ text, matched: false }];

  const segments: SearchMatchSegment[] = [];
  const lowerText = text.toLowerCase();
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = lowerText.indexOf(normalised, cursor);
    if (matchIndex === -1) {
      segments.push({ text: text.slice(cursor), matched: false });
      break;
    }
    if (matchIndex > cursor) {
      segments.push({ text: text.slice(cursor, matchIndex), matched: false });
    }
    segments.push({ text: text.slice(matchIndex, matchIndex + normalised.length), matched: true });
    cursor = matchIndex + normalised.length;
  }

  return segments;
}

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
  const s = stockStatus.replace(/_/g, '');
  return s === 'instock' || s === 'lowstock';
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

export function toCartProduct(product: Product, variation?: ProductVariation): ProductListItem {
  if (variation) {
    return {
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      slug: product.slug,
      price: variation.price,
      discountPrice: variation.discountPrice,
      memberPrice: variation.memberPrice,
      seoTitle: product.seoTitle,
      status: product.status,
      stockStatus: variation.stockStatus,
      categoryName: product.categoryName,
      categories: product.categories,
      isVariable: product.isVariable,
      image: product.images.length > 0 ? product.images[0].src : null,
    };
  }
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

export function findVariation(
  variations: ProductVariation[],
  selections: Record<string, string>,
): ProductVariation | undefined {
  const selectionEntries = Object.entries(selections);
  if (selectionEntries.length === 0) return undefined;
  return variations.find((v) =>
    selectionEntries.every(([optionName, value]) =>
      v.selectedOptions.some(
        (so) => so.optionName === optionName && so.value === value,
      ),
    ),
  );
}

export function getVariationLabel(variation: ProductVariation): string {
  return variation.selectedOptions.map((so) => so.value).join(' / ');
}
