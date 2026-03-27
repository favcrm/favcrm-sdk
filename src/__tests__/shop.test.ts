import { describe, it, expect } from 'vitest';
import {
  getEffectivePrice,
  hasDiscount,
  isInStock,
  getProductLink,
  getCategoryLabel,
  getPrimaryImage,
  toCartProduct,
  findVariation,
  getVariationLabel,
  normalizeSearchQuery,
  matchesSearchQuery,
  filterProducts,
  filterProductsByCategory,
  highlightSearchMatch,
} from '../shop.js';
import type { Product, ProductImage, ProductVariation } from '../types/shop.js';

describe('getEffectivePrice', () => {
  it('returns memberPrice when available', () => {
    expect(getEffectivePrice({ memberPrice: 80, discountPrice: 90, price: 100 })).toBe(80);
  });

  it('returns discountPrice when no memberPrice', () => {
    expect(getEffectivePrice({ memberPrice: null, discountPrice: 90, price: 100 })).toBe(90);
  });

  it('returns price when no memberPrice or discountPrice', () => {
    expect(getEffectivePrice({ memberPrice: null, discountPrice: null, price: 100 })).toBe(100);
  });

  it('returns 0 when all prices are null', () => {
    expect(getEffectivePrice({ memberPrice: null, discountPrice: null, price: null })).toBe(0);
  });
});

describe('hasDiscount', () => {
  it('returns true when discountPrice < price', () => {
    expect(hasDiscount({ discountPrice: 80, memberPrice: null, price: 100 })).toBe(true);
  });

  it('returns true when memberPrice < price', () => {
    expect(hasDiscount({ discountPrice: null, memberPrice: 70, price: 100 })).toBe(true);
  });

  it('returns false when no discount', () => {
    expect(hasDiscount({ discountPrice: null, memberPrice: null, price: 100 })).toBe(false);
  });

  it('returns false when price is null', () => {
    expect(hasDiscount({ discountPrice: 80, memberPrice: null, price: null })).toBe(false);
  });

  it('returns false when discountPrice >= price', () => {
    expect(hasDiscount({ discountPrice: 100, memberPrice: null, price: 100 })).toBe(false);
  });
});

describe('isInStock', () => {
  it('returns true for instock', () => {
    expect(isInStock('instock')).toBe(true);
  });

  it('returns true for lowstock', () => {
    expect(isInStock('lowstock')).toBe(true);
  });

  it('returns false for outofstock', () => {
    expect(isInStock('outofstock')).toBe(false);
  });

  it('returns true for in_stock (snake_case)', () => {
    expect(isInStock('in_stock')).toBe(true);
  });

  it('returns true for low_stock (snake_case)', () => {
    expect(isInStock('low_stock')).toBe(true);
  });

  it('returns false for out_of_stock (snake_case)', () => {
    expect(isInStock('out_of_stock')).toBe(false);
  });
});

describe('getProductLink', () => {
  it('uses slug when available', () => {
    expect(getProductLink({ slug: 'my-product', id: 42 })).toBe('/shop/my-product');
  });

  it('falls back to id when no slug', () => {
    expect(getProductLink({ slug: null, id: 42 })).toBe('/shop/42');
  });
});

describe('getCategoryLabel', () => {
  it('returns categoryName when available', () => {
    expect(getCategoryLabel({ categoryName: 'Apparel', categories: [] })).toBe('Apparel');
  });

  it('returns first category name when no categoryName', () => {
    expect(getCategoryLabel({
      categoryName: null,
      categories: [{ id: 1, name: 'Shoes', slug: 'shoes' }],
    })).toBe('Shoes');
  });

  it('returns empty string when no category info', () => {
    expect(getCategoryLabel({ categoryName: null, categories: [] })).toBe('');
  });
});

describe('getPrimaryImage', () => {
  const mockImage: ProductImage = {
    id: 1, src: 'img.jpg', name: 'img', alt: 'alt',
    blurhash: '', thumbUrl: 'thumb.jpg', mediumUrl: 'med.jpg',
    width: 100, height: 100, isPrimary: true,
  };

  it('returns first image', () => {
    expect(getPrimaryImage({ images: [mockImage] })).toBe(mockImage);
  });

  it('returns null when no images', () => {
    expect(getPrimaryImage({ images: [] })).toBeNull();
  });
});

describe('toCartProduct', () => {
  it('maps Product to ProductListItem', () => {
    const product = {
      id: 1, name: 'Test', shortName: null, description: 'Desc',
      slug: 'test', sku: null, price: 100, discountPrice: null,
      memberPrice: null, regularPrice: 100, salePrice: null,
      onSale: false, seoTitle: 'SEO', seoDescription: null,
      shippingWeight: null, status: 'publish', stockQuantity: 10,
      stockStatus: 'instock', categoryId: 1, categoryName: 'Cat',
      categories: [{ id: 1, name: 'Cat', slug: 'cat' }],
      isVariable: false, isVariation: false, parentProductId: null,
      images: [{ id: 1, src: 'img.jpg', name: 'img', alt: 'alt',
        blurhash: '', thumbUrl: 'thumb.jpg', mediumUrl: 'med.jpg',
        width: 100, height: 100, isPrimary: true }],
      options: [], selectedOptions: [], variations: [],
    } satisfies Product;

    const result = toCartProduct(product);
    expect(result.id).toBe(1);
    expect(result.name).toBe('Test');
    expect(result.image).toBe('img.jpg');
    expect(result.description).toBe('Desc');
  });

  it('handles null description', () => {
    const product = {
      id: 1, name: 'Test', shortName: null, description: null,
      slug: null, sku: null, price: 100, discountPrice: null,
      memberPrice: null, regularPrice: 100, salePrice: null,
      onSale: false, seoTitle: null, seoDescription: null,
      shippingWeight: null, status: 'publish', stockQuantity: 0,
      stockStatus: 'outofstock', categoryId: null, categoryName: null,
      categories: [], isVariable: false, isVariation: false,
      parentProductId: null, images: [], options: [],
      selectedOptions: [], variations: [],
    } satisfies Product;

    const result = toCartProduct(product);
    expect(result.description).toBe('');
    expect(result.image).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

describe('normalizeSearchQuery', () => {
  it('trims and lowercases', () => {
    expect(normalizeSearchQuery('  Hello World  ')).toBe('hello world');
  });

  it('collapses whitespace', () => {
    expect(normalizeSearchQuery('a   b\tc')).toBe('a b c');
  });

  it('returns empty string for whitespace-only', () => {
    expect(normalizeSearchQuery('   ')).toBe('');
  });

  it('handles CJK characters', () => {
    expect(normalizeSearchQuery(' 檀香 ')).toBe('檀香');
  });
});

describe('matchesSearchQuery', () => {
  const product = { name: 'Sandalwood Incense', description: '天然檀香 premium quality' };

  it('matches by name (case-insensitive)', () => {
    expect(matchesSearchQuery(product, 'sandalwood')).toBe(true);
    expect(matchesSearchQuery(product, 'INCENSE')).toBe(true);
  });

  it('matches by description', () => {
    expect(matchesSearchQuery(product, 'premium')).toBe(true);
  });

  it('matches CJK in description', () => {
    expect(matchesSearchQuery(product, '檀香')).toBe(true);
  });

  it('returns true for empty query', () => {
    expect(matchesSearchQuery(product, '')).toBe(true);
    expect(matchesSearchQuery(product, '   ')).toBe(true);
  });

  it('returns false for non-matching query', () => {
    expect(matchesSearchQuery(product, 'lavender')).toBe(false);
  });
});

describe('filterProducts', () => {
  const products = [
    { name: 'Sandalwood Incense', description: 'Natural wood aroma' },
    { name: 'Lavender Candle', description: 'Calming scent' },
    { name: 'Agarwood Chips', description: '沉香木片 premium' },
  ];

  it('returns all products for empty query', () => {
    expect(filterProducts(products, '')).toHaveLength(3);
  });

  it('filters by name match', () => {
    const result = filterProducts(products, 'candle');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Lavender Candle');
  });

  it('filters by description match', () => {
    const result = filterProducts(products, 'aroma');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sandalwood Incense');
  });

  it('filters by CJK characters', () => {
    const result = filterProducts(products, '沉香');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Agarwood Chips');
  });

  it('returns empty array when nothing matches', () => {
    expect(filterProducts(products, 'xyz')).toHaveLength(0);
  });
});

describe('filterProductsByCategory', () => {
  const products = [
    { name: 'A', categories: [{ id: 1, name: 'Woody', slug: 'woody' }] },
    { name: 'B', categories: [{ id: 2, name: 'Floral', slug: 'floral' }] },
    { name: 'C', categories: [{ id: 1, name: 'Woody', slug: 'woody' }, { id: 2, name: 'Floral', slug: 'floral' }] },
  ];

  it('returns all products for empty slug', () => {
    expect(filterProductsByCategory(products, '')).toHaveLength(3);
  });

  it('filters by category slug', () => {
    const result = filterProductsByCategory(products, 'floral');
    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(['B', 'C']);
  });

  it('returns empty array for non-matching slug', () => {
    expect(filterProductsByCategory(products, 'citrus')).toHaveLength(0);
  });
});

describe('highlightSearchMatch', () => {
  it('returns single unmatched segment for empty query', () => {
    const result = highlightSearchMatch('Hello', '');
    expect(result).toEqual([{ text: 'Hello', matched: false }]);
  });

  it('highlights single match', () => {
    const result = highlightSearchMatch('Sandalwood Incense', 'wood');
    expect(result).toEqual([
      { text: 'Sandal', matched: false },
      { text: 'wood', matched: true },
      { text: ' Incense', matched: false },
    ]);
  });

  it('highlights multiple matches', () => {
    const result = highlightSearchMatch('cat and cat', 'cat');
    expect(result).toEqual([
      { text: 'cat', matched: true },
      { text: ' and ', matched: false },
      { text: 'cat', matched: true },
    ]);
  });

  it('is case-insensitive but preserves original casing', () => {
    const result = highlightSearchMatch('SandalWOOD', 'wood');
    expect(result).toEqual([
      { text: 'Sandal', matched: false },
      { text: 'WOOD', matched: true },
    ]);
  });

  it('handles match at start', () => {
    const result = highlightSearchMatch('Hello world', 'hello');
    expect(result).toEqual([
      { text: 'Hello', matched: true },
      { text: ' world', matched: false },
    ]);
  });

  it('handles full text match', () => {
    const result = highlightSearchMatch('hello', 'hello');
    expect(result).toEqual([{ text: 'hello', matched: true }]);
  });

  it('handles empty text', () => {
    const result = highlightSearchMatch('', 'test');
    expect(result).toEqual([{ text: '', matched: false }]);
  });

  it('handles CJK text', () => {
    const result = highlightSearchMatch('天然檀香精油', '檀香');
    expect(result).toEqual([
      { text: '天然', matched: false },
      { text: '檀香', matched: true },
      { text: '精油', matched: false },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Variation helpers
// ---------------------------------------------------------------------------

const makeVariation = (overrides: Partial<ProductVariation> = {}): ProductVariation => ({
  id: 10,
  name: 'Small / Red',
  sku: null,
  price: 120,
  discountPrice: null,
  memberPrice: null,
  regularPrice: 120,
  salePrice: null,
  onSale: false,
  seoTitle: '',
  shippingWeight: null,
  selectedOptions: [
    { optionName: 'Size', value: 'Small' },
    { optionName: 'Color', value: 'Red' },
  ],
  stockQuantity: 5,
  stockStatus: 'instock',
  parentId: 1,
  ...overrides,
});

describe('toCartProduct with variation', () => {
  const product: Product = {
    id: 1, name: 'Tee', shortName: null, description: 'A shirt',
    slug: 'tee', sku: null, price: 100, discountPrice: null,
    memberPrice: null, regularPrice: 100, salePrice: null,
    onSale: false, seoTitle: null, seoDescription: null,
    shippingWeight: null, status: 'publish', stockQuantity: 10,
    stockStatus: 'instock', categoryId: null, categoryName: null,
    categories: [], isVariable: true, isVariation: false,
    parentProductId: null, images: [], options: [],
    selectedOptions: [], variations: [],
  };

  it('uses variation pricing when provided', () => {
    const variation = makeVariation({ price: 150, memberPrice: 130 });
    const result = toCartProduct(product, variation);
    expect(result.price).toBe(150);
    expect(result.memberPrice).toBe(130);
    expect(result.stockStatus).toBe('instock');
  });

  it('falls back to product pricing without variation', () => {
    const result = toCartProduct(product);
    expect(result.price).toBe(100);
  });
});

describe('findVariation', () => {
  const variations = [
    makeVariation({ id: 10, selectedOptions: [{ optionName: 'Size', value: 'S' }, { optionName: 'Color', value: 'Red' }] }),
    makeVariation({ id: 11, selectedOptions: [{ optionName: 'Size', value: 'M' }, { optionName: 'Color', value: 'Red' }] }),
    makeVariation({ id: 12, selectedOptions: [{ optionName: 'Size', value: 'S' }, { optionName: 'Color', value: 'Blue' }] }),
  ];

  it('finds matching variation', () => {
    const found = findVariation(variations, { Size: 'M', Color: 'Red' });
    expect(found?.id).toBe(11);
  });

  it('returns undefined for no match', () => {
    expect(findVariation(variations, { Size: 'L', Color: 'Red' })).toBeUndefined();
  });

  it('returns undefined for empty selections', () => {
    expect(findVariation(variations, {})).toBeUndefined();
  });
});

describe('getVariationLabel', () => {
  it('joins option values', () => {
    const variation = makeVariation();
    expect(getVariationLabel(variation)).toBe('Small / Red');
  });
});
