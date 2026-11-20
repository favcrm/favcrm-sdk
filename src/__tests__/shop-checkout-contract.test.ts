import { describe, expect, it, vi } from 'vitest';
import { FavCRM } from '../client.js';
import { buildCreateOrderRequest, validateCheckoutForm } from '../checkout.js';
import { getEffectivePrice } from '../shop.js';
import type { CartItem, ShopOrderCreateResult, ShopOrderHistory, ShopQuote } from '../index.js';

// Wire fields mirror the customer Worker's checkout and history schemas.
const quote: ShopQuote = {
  currency: 'HKD', items: [{ productId: 1, variationId: null, quantity: 1, unitPriceMinor: 9000, lineTotalMinor: 9000 }],
  fulfillmentType: 'pickup', subtotalMinor: 9000, discountMinor: 0, shippingMinor: 0,
  creditsUsedMinor: 0, payableMinor: 9000, quoteFingerprint: 'a'.repeat(64),
};
const item = { variationId: null, productName: '茶具', variantName: null, sku: null, quantity: 1, unitPrice: 90, lineTotal: 90 };
const created: ShopOrderCreateResult = {
  orderId: 'order-uuid', orderNumber: 'SO-1', status: 'pending', paymentState: 'awaiting_manual',
  subtotal: 90, discountAmount: 0, shippingCost: 0, totalAmount: 90,
  paymentUrl: null, paymentInstructions: 'Transfer at counter', items: [item], createdAt: '2026-01-01T00:00:00Z',
};
const history: ShopOrderHistory = {
  orderId: 'order-uuid', orderNumber: 'SO-1', status: 'confirmed', createdAt: '2026-01-01T00:00:00Z',
  currency: 'HKD', subtotal: 90, discountAmount: 10, shippingCost: 5, totalAmount: 85, creditsUsed: 5,
  fulfillmentType: 'pickup', pickupReadyAt: '2026-01-02T00:00:00Z', paymentState: 'paid', paidAt: null, items: [item],
};

function setup(responses: unknown[]) {
  const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, data: responses.shift() }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }));
  const sdk = new FavCRM({ baseUrl: 'https://api.test', companyId: 'tenant', fetch });
  return { sdk, fetch };
}

describe('shop checkout Worker contract', () => {
  it('quotes selections and creates a keyed pickup order without an address', async () => {
    const { sdk, fetch } = setup([quote, created]);
    const selection = { lineItems: [{ productId: 1, quantity: 1 }], shippingMethodId: 2, promotionCode: 'TEN', creditsUsed: '5.00' };
    expect(await sdk.shop.quoteOrder(selection)).toEqual(quote);
    const request = { ...selection, customerInfo: { firstName: 'Mei', lastName: 'Chan', email: 'mei@example.test' }, expectedQuoteFingerprint: quote.quoteFingerprint };
    expect(await sdk.shop.createOrder(request, { idempotencyKey: 'attempt-key' })).toEqual(created);
    expect(fetch.mock.calls[0][0]).toBe('https://api.test/v6/customer-portal/shop/orders/quote');
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(selection) });
    expect(fetch.mock.calls[1][0]).toBe('https://api.test/v6/customer-portal/shop/orders');
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST', headers: { 'Idempotency-Key': 'attempt-key' }, body: JSON.stringify(request) });
  });

  it('uses opt-in history views, retains legacy routes and reads payment and shipping classifications', async () => {
    const methods = [{ id: 2, name: 'Pickup', description: null, cost: 0, freeShippingThreshold: null, estimatedDays: null, fulfillmentType: 'pickup' }];
    const page = { orders: [history], nextCursor: 'abc_def' };
    const payment = { orderId: 'order-uuid', orderStatus: 'pending', paymentStatus: 'pending', paymentState: 'awaiting_manual', paidAt: null };
    const { sdk, fetch } = setup([methods, page, history, payment, [history], history]);
    sdk.setToken('member-token');
    expect(await sdk.shop.listShippingMethods()).toEqual(methods);
    expect(await sdk.shop.listOrdersPage({ limit: 1, cursor: 'abc_def', status: 'ready' })).toEqual(page);
    expect(await sdk.shop.getOrderHistoryDetail('order-uuid')).toEqual(history);
    expect(await sdk.shop.getOrderPaymentStatus('order-uuid')).toEqual(payment);
    expect(await sdk.shop.listOrders()).toEqual([history]);
    expect(await sdk.shop.getOrder('order-uuid')).toEqual(history);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://api.test/v6/customer-portal/shop/shipping-methods',
      'https://api.test/v6/customer-portal/shop/orders?view=page&limit=1&cursor=abc_def&status=ready',
      'https://api.test/v6/customer-portal/shop/orders/order-uuid?view=history',
      'https://api.test/v6/customer-portal/shop/orders/order-uuid/payment-status',
      'https://api.test/v6/customer-portal/shop/orders',
      'https://api.test/v6/customer-portal/shop/orders/order-uuid',
    ]);
    expect(fetch.mock.calls[1][1]).toMatchObject({ headers: { Authorization: 'Bearer member-token' } });
  });

  it('encodes product slugs as path segments', async () => {
    const { sdk, fetch } = setup([{}, []]);
    await sdk.shop.getProduct('茶具/特價');
    await sdk.shop.getRelatedProducts('茶具/特價');
    expect(fetch.mock.calls[0][0]).toBe('https://api.test/v6/customer-portal/shop/products/%E8%8C%B6%E5%85%B7%2F%E7%89%B9%E5%83%B9');
    expect(fetch.mock.calls[1][0]).toBe('https://api.test/v6/customer-portal/shop/products/%E8%8C%B6%E5%85%B7%2F%E7%89%B9%E5%83%B9/related?limit=4');
  });


  it('keeps address validation and pricing defaults while allowing explicit pickup and guest pricing', () => {
    const form = { firstName: 'Mei', lastName: 'Chan', email: 'mei@example.test', phone: '', addressLine1: '', addressLine2: '', city: '', country: 'HK' };
    expect(validateCheckoutForm(form)).toBe('REQUIRED_FIELDS_MISSING');
    expect(validateCheckoutForm(form, { requiresAddress: false })).toBeNull();
    expect(validateCheckoutForm({ ...form, email: 'bad' }, { requiresAddress: false })).toBe('INVALID_EMAIL');
    const cart: CartItem[] = [];
    expect(buildCreateOrderRequest(cart, form, 2).shippingAddress).toBeDefined();
    const request = buildCreateOrderRequest(cart, form, 2, undefined, { omitShippingAddress: true, expectedQuoteFingerprint: quote.quoteFingerprint });
    expect(request).not.toHaveProperty('shippingAddress');
    expect(request.expectedQuoteFingerprint).toBe(quote.quoteFingerprint);
    const prices = { price: 100, discountPrice: 90, memberPrice: 80 };
    expect(getEffectivePrice(prices)).toBe(80);
    expect(getEffectivePrice(prices, false)).toBe(90);
  });
});
