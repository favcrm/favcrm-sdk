import { describe, it, expect } from 'vitest';
import {
  calculateFinalTotal,
  validateCheckoutForm,
  buildCreateOrderRequest,
  computeShippingEligibility,
  pickDefaultShippingId,
} from '../checkout.js';
import type { CartItem, ShippingMethod } from '../types/shop.js';

const makeMethod = (over: Partial<ShippingMethod> = {}): ShippingMethod => ({
  id: 1,
  name: 'Standard',
  description: null,
  cost: 50,
  freeShippingThreshold: null,
  ...over,
});

describe('computeShippingEligibility', () => {
  it('returns cost as-is when no threshold', () => {
    const r = computeShippingEligibility([makeMethod()], 10);
    expect(r[0]).toMatchObject({ meetsThreshold: false, locked: false, effectiveCost: 50, amountToUnlock: 0 });
  });

  it('locks free-only method below threshold with unlock amount', () => {
    const r = computeShippingEligibility(
      [makeMethod({ id: 2, cost: 0, freeShippingThreshold: 500 })],
      300,
    );
    expect(r[0]).toMatchObject({ meetsThreshold: false, locked: true, effectiveCost: 0, amountToUnlock: 200 });
  });

  it('unlocks free-only method when threshold met', () => {
    const r = computeShippingEligibility(
      [makeMethod({ id: 2, cost: 0, freeShippingThreshold: 500 })],
      600,
    );
    expect(r[0]).toMatchObject({ meetsThreshold: true, locked: false, effectiveCost: 0, amountToUnlock: 0 });
  });

  it('waives paid cost when paid method has a threshold that is met', () => {
    const r = computeShippingEligibility(
      [makeMethod({ cost: 50, freeShippingThreshold: 500 })],
      600,
    );
    expect(r[0]).toMatchObject({ meetsThreshold: true, locked: false, effectiveCost: 0 });
  });

  it('returns empty array for empty input', () => {
    expect(computeShippingEligibility([], 100)).toEqual([]);
  });
});

describe('pickDefaultShippingId', () => {
  it('picks first unlocked method', () => {
    const e = computeShippingEligibility(
      [
        makeMethod({ id: 1, cost: 0, freeShippingThreshold: 500 }),
        makeMethod({ id: 2, cost: 50 }),
      ],
      100,
    );
    expect(pickDefaultShippingId(e)).toBe(2);
  });

  it('returns null when all locked', () => {
    const e = computeShippingEligibility(
      [makeMethod({ id: 1, cost: 0, freeShippingThreshold: 500 })],
      100,
    );
    expect(pickDefaultShippingId(e)).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(pickDefaultShippingId([])).toBeNull();
  });
});

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
      firstName: 'John', lastName: 'Doe', email: 'john@test.com',
      addressLine1: '123 St', city: 'HK',
    })).toBeNull();
  });

  it('returns error key when firstName missing', () => {
    expect(validateCheckoutForm({
      firstName: '', lastName: 'Doe', email: 'john@test.com',
      addressLine1: '123 St', city: 'HK',
    })).toBe('REQUIRED_FIELDS_MISSING');
  });

  it('returns error key when email missing', () => {
    expect(validateCheckoutForm({
      firstName: 'John', lastName: 'Doe', email: '',
      addressLine1: '123 St', city: 'HK',
    })).toBe('REQUIRED_FIELDS_MISSING');
  });

  it('returns error key when city is whitespace only', () => {
    expect(validateCheckoutForm({
      firstName: 'John', lastName: 'Doe', email: 'john@test.com',
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

  it('includes variationId when present in cart item', () => {
    const cartWithVariation: CartItem[] = [
      {
        product: {
          id: 1, name: 'Item', description: '', slug: null,
          price: 100, discountPrice: null, memberPrice: null,
          seoTitle: null, status: null, stockStatus: 'instock',
          categoryName: null, categories: [], isVariable: true, image: null,
        },
        quantity: 1,
        variationId: 42,
        variationName: 'Large / Blue',
      },
    ];
    const req = buildCreateOrderRequest(cartWithVariation, form, null);
    expect(req.lineItems[0].variationId).toBe(42);
  });

  it('includes accepted offers when provided', () => {
    const req = buildCreateOrderRequest(cart, form, null, undefined, {
      acceptedOffers: [{ ruleId: 'rule-1', productId: 2, quantity: 1 }],
    });
    expect(req.acceptedOffers).toEqual([{ ruleId: 'rule-1', productId: 2, quantity: 1 }]);
  });

  it('omits variationId when not present', () => {
    const req = buildCreateOrderRequest(cart, form, null);
    expect(req.lineItems[0]).not.toHaveProperty('variationId');
  });
});
