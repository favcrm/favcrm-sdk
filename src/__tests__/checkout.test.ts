import { describe, it, expect } from 'vitest';
import {
  calculateFinalTotal,
  validateCheckoutForm,
  buildCreateOrderRequest,
} from '../checkout.js';
import type { CartItem } from '../types/shop.js';

describe('calculateFinalTotal', () => {
  it('calculates total correctly', () => {
    expect(calculateFinalTotal(100, 20, 10)).toBe(90);
  });

  it('never goes below zero', () => {
    expect(calculateFinalTotal(10, 100, 0)).toBe(0);
  });

  it('handles zero discount and shipping', () => {
    expect(calculateFinalTotal(50, 0, 0)).toBe(50);
  });
});

describe('validateCheckoutForm', () => {
  it('returns null when all required fields present', () => {
    expect(validateCheckoutForm({
      firstName: 'John', lastName: 'Doe',
      addressLine1: '123 St', city: 'HK',
    })).toBeNull();
  });

  it('returns error key when firstName missing', () => {
    expect(validateCheckoutForm({
      firstName: '', lastName: 'Doe',
      addressLine1: '123 St', city: 'HK',
    })).toBe('REQUIRED_FIELDS_MISSING');
  });

  it('returns error key when city is whitespace only', () => {
    expect(validateCheckoutForm({
      firstName: 'John', lastName: 'Doe',
      addressLine1: '123 St', city: '   ',
    })).toBe('REQUIRED_FIELDS_MISSING');
  });
});

describe('buildCreateOrderRequest', () => {
  const cart: CartItem[] = [
    {
      product: {
        id: 1, name: 'Item', description: '', slug: null,
        price: 100, discountPrice: null, memberPrice: null,
        seoTitle: null, status: null, stockStatus: 'instock',
        categoryName: null, categories: [], isVariable: false, image: null,
      },
      quantity: 2,
    },
  ];

  const form = {
    firstName: 'John', lastName: 'Doe',
    email: 'john@test.com', phone: '',
    addressLine1: '123 St', addressLine2: '',
    city: 'HK', country: 'HK',
  };

  it('builds correct request structure', () => {
    const req = buildCreateOrderRequest(cart, form, 5, 'SAVE10');
    expect(req.lineItems).toEqual([{ productId: 1, quantity: 2 }]);
    expect(req.customerInfo.firstName).toBe('John');
    expect(req.customerInfo.phone).toBeUndefined();
    expect(req.shippingAddress.addressLine2).toBeUndefined();
    expect(req.shippingMethodId).toBe(5);
    expect(req.promotionCode).toBe('SAVE10');
  });

  it('handles null shippingMethodId', () => {
    const req = buildCreateOrderRequest(cart, form, null);
    expect(req.shippingMethodId).toBeUndefined();
    expect(req.promotionCode).toBeUndefined();
  });
});
