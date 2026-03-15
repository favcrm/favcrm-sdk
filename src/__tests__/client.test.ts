import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FavCRMClient, FavCRMError } from '../client';
import type { FavCRMConfig } from '../client';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as Response;
}

describe('FavCRMClient', () => {
  const config: FavCRMConfig = {
    baseUrl: 'https://api.example.com',
    brandUuid: 'test-brand-uuid',
    portalToken: 'test-portal-token',
    locale: 'zh-HK',
  };

  let client: FavCRMClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new FavCRMClient(config);
  });

  describe('request', () => {
    it('sends correct headers on GET (no Content-Type)', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await client.request('GET', '/test/');

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Content-Type']).toBeUndefined();
      expect(init.headers['Accept']).toBe('application/json');
      expect(init.headers['X-Portal-Token']).toBe('test-portal-token');
      expect(init.headers['Accept-Language']).toBe('zh-HK');
    });

    it('sends Content-Type on POST with body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await client.request('POST', '/test/', { data: 1 });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Content-Type']).toBe('application/json');
    });

    it('omits portal token header when not configured', async () => {
      const noTokenClient = new FavCRMClient({
        baseUrl: 'https://api.example.com',
        brandUuid: 'test-brand-uuid',
      });
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await noTokenClient.request('GET', '/test/');

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['X-Portal-Token']).toBeUndefined();
      expect(init.headers['Accept-Language']).toBeUndefined();
    });

    it('builds correct URL', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await client.request('GET', '/v6/test/');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/test/');
    });

    it('sends JSON body for POST', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      await client.request('POST', '/test/', { name: 'Alice' });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(init.body).toBe('{"name":"Alice"}');
    });

    it('omits body for GET', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await client.request('GET', '/test/');

      const [, init] = mockFetch.mock.calls[0];
      expect(init.body).toBeUndefined();
    });

    it('throws FavCRMError on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      try {
        await client.request('GET', '/test/');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(FavCRMError);
        const e = err as FavCRMError;
        expect(e.code).toBe('NETWORK_ERROR');
        expect(e.message).toBe('Failed to fetch');
      }
    });

    it('throws FavCRMError on HTTP 4xx with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: 'Not found', detail: 'Resource missing' }, 404),
      );

      try {
        await client.request('GET', '/test/');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(FavCRMError);
        const e = err as FavCRMError;
        expect(e.code).toBe('HTTP_404');
        expect(e.message).toBe('Not found');
        expect(e.details).toEqual({ message: 'Not found', detail: 'Resource missing' });
      }
    });

    it('throws FavCRMError on HTTP 5xx with non-JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
        headers: new Headers(),
      } as Response);

      try {
        await client.request('GET', '/test/');
        expect.fail('Should have thrown');
      } catch (err) {
        const e = err as FavCRMError;
        expect(e.code).toBe('HTTP_500');
        expect(e.message).toBe('Internal Server Error');
      }
    });

    it('throws PARSE_ERROR on invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        headers: new Headers(),
      } as unknown as Response);

      await expect(client.request('GET', '/test/')).rejects.toThrow(FavCRMError);
    });
  });

  describe('submitRegistration', () => {
    it('calls correct endpoint with data', async () => {
      const result = { id: 1, uuid: 'abc', code: 'M001', name: 'Alice', phone: '91234567', membershipTier: { id: 1, name: 'Gold' }, token: 'jwt' };
      mockFetch.mockResolvedValueOnce(jsonResponse(result));

      const data = {
        name: 'Alice',
        phone: '91234567',
        agreeToReceivePromotion: true,
        agreeToPrivacyPolicy: true,
      };
      const res = await client.submitRegistration(data);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/registration/');
      expect(init.method).toBe('POST');
      expect(res).toEqual(result);
    });
  });

  describe('submitEventRegistration', () => {
    it('calls correct endpoint', async () => {
      const result = { id: 1, eventSlug: 'summer-fest', eventTitle: 'Summer Fest', status: 'confirmed', registeredAt: '2026-03-15', totalAmount: 100, currency: 'HKD', paymentRequired: false };
      mockFetch.mockResolvedValueOnce(jsonResponse(result));

      await client.submitEventRegistration({
        eventSlug: 'summer-fest',
        sessionId: 1,
        quantity: 2,
        guestName: 'Bob',
        email: 'bob@test.com',
        phone: '91234567',
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/events/summer-fest/register/');
    });
  });

  describe('createOrder', () => {
    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, orderId: 'ORD-001' }));

      await client.createOrder({
        lineItems: [{ productId: 1, quantity: 2 }],
        customerInfo: { firstName: 'Alice', lastName: 'Wong' },
        shippingAddress: { addressLine1: '123 Main St', city: 'HK' },
      });

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/shop/orders/');
      expect(init.method).toBe('POST');
    });
  });

  describe('claimCoupon', () => {
    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ couponCode: 'WELCOME10', message: 'Claimed!' }));

      await client.claimCoupon({ name: 'Alice', email: 'alice@test.com' });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/claim-coupon/');
    });
  });

  describe('validatePromotion', () => {
    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ isValid: true, promotionCode: 'SALE20' }));

      await client.validatePromotion({
        promotionCode: 'SALE20',
        channel: 'online',
        amount: 500,
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/validate-promotion/');
    });
  });

  describe('getProducts', () => {
    it('calls correct endpoint without params', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await client.getProducts();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/shop/products/');
    });

    it('appends query params', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await client.getProducts({ category: 'shirts', page: 2 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('category=shirts');
      expect(url).toContain('page=2');
    });
  });

  describe('getProduct', () => {
    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: 'T-Shirt' }));

      await client.getProduct('cool-tshirt');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/shop/products/cool-tshirt/');
    });
  });

  describe('getCategories', () => {
    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await client.getCategories();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/shop/categories/');
    });
  });

  describe('getShippingMethods', () => {
    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await client.getShippingMethods();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/shop/shipping-methods/');
    });
  });

  describe('getEvents', () => {
    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await client.getEvents();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/events/');
    });
  });

  describe('getEvent', () => {
    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, slug: 'summer-fest' }));

      await client.getEvent('summer-fest');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v6/member-portal/brands/test-brand-uuid/events/summer-fest/');
    });
  });
});
