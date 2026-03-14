import { describe, it, expect } from 'vitest';
import {
  getEffectivePrice,
  hasDiscount,
  isInStock,
  getProductLink,
  getCategoryLabel,
  getPrimaryImage,
  toCartProduct,
} from '../shop.js';
import type { Product, ProductImage } from '../types/shop.js';

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
