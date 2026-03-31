import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FavCRM, FavCRMError } from '../client.js';

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function envelope<T>(data: T) {
  return { success: true, data };
}

describe('FavCRM Client', () => {
  let sdk: FavCRM;

  beforeEach(() => {
    sdk = new FavCRM({
      baseUrl: 'https://api.test.com',
      companyId: 'company-123',
    });
  });

  describe('request basics', () => {
    it('sends X-Company-Id header on every request', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);

      await sdk.shop.listProducts();

      expect(fetch).toHaveBeenCalledOnce();
      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers['X-Company-Id']).toBe('company-123');
    });

    it('does not send Authorization header when no token set', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);

      await sdk.shop.listCategories();

      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers['Authorization']).toBeUndefined();
    });

    it('sends Authorization header after setToken', async () => {
      const fetch = mockFetch(envelope({}));
      vi.stubGlobal('fetch', fetch);

      sdk.setToken('jwt-abc');
      await sdk.members.getProfile();

      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers['Authorization']).toBe('Bearer jwt-abc');
    });

    it('removes Authorization header after clearToken', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);

      sdk.setToken('jwt-abc');
      sdk.clearToken();
      await sdk.shop.listProducts();

      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers['Authorization']).toBeUndefined();
    });

    it('unwraps { success, data } envelope', async () => {
      const products = [{ id: 1, name: 'Test' }];
      vi.stubGlobal('fetch', mockFetch(envelope(products)));

      const result = await sdk.shop.listProducts();
      expect(result).toEqual(products);
    });

    it('passes through non-envelope responses', async () => {
      const raw = [{ id: 1 }];
      vi.stubGlobal('fetch', mockFetch(raw));

      const result = await sdk.shop.listProducts();
      expect(result).toEqual(raw);
    });

    it('throws FavCRMError on non-OK response', async () => {
      vi.stubGlobal('fetch', mockFetch(
        { error: { message: 'Not found', code: 'NOT_FOUND' } },
        404,
      ));

      await expect(sdk.shop.getProduct('nope')).rejects.toThrow(FavCRMError);
      try {
        await sdk.shop.getProduct('nope');
      } catch (e) {
        expect((e as FavCRMError).status).toBe(404);
        expect((e as FavCRMError).code).toBe('NOT_FOUND');
      }
    });

    it('calls onUnauthorized on 401', async () => {
      const onUnauthorized = vi.fn();
      const authedSdk = new FavCRM({
        baseUrl: 'https://api.test.com',
        companyId: 'c',
        onUnauthorized,
      });

      vi.stubGlobal('fetch', mockFetch({}, 401));

      await expect(authedSdk.members.getProfile()).rejects.toThrow();
      expect(onUnauthorized).toHaveBeenCalledOnce();
    });
  });

  describe('shop', () => {
    it('listProducts builds correct URL with params', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);

      await sdk.shop.listProducts({ category_slug: 'incense', search: 'sandalwood', page: 2 });

      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain('/v6/customer-portal/shop/products?');
      expect(url).toContain('category_slug=incense');
      expect(url).toContain('search=sandalwood');
      expect(url).toContain('page=2');
    });

    it('getProduct calls correct endpoint', async () => {
      const fetch = mockFetch(envelope({ id: 1, name: 'Test' }));
      vi.stubGlobal('fetch', fetch);

      await sdk.shop.getProduct('test-product');
      expect(fetch.mock.calls[0][0]).toContain('/shop/products/test-product');
    });

    it('createOrder sends POST with body', async () => {
      const fetch = mockFetch(envelope({ orderId: 'ord-1' }));
      vi.stubGlobal('fetch', fetch);

      await sdk.shop.createOrder({ lineItems: [], customerInfo: { firstName: 'A', lastName: 'B' }, shippingAddress: { addressLine1: '1', city: 'HK' } } as any);

      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toHaveProperty('lineItems');
    });

    it('listShippingMethods passes order_amount param', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);

      await sdk.shop.listShippingMethods(500);
      expect(fetch.mock.calls[0][0]).toContain('order_amount=500');
    });
  });

  describe('bookings', () => {
    it('listServices calls /services', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);

      await sdk.bookings.listServices();
      expect(fetch.mock.calls[0][0]).toContain('/v6/customer-portal/services');
    });

    it('getTimeSlots passes date param', async () => {
      const fetch = mockFetch(envelope({ slots: [] }));
      vi.stubGlobal('fetch', fetch);

      await sdk.bookings.getTimeSlots('svc-1', { date: '2026-04-01' });
      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain('/services/svc-1/slots');
      expect(url).toContain('date=2026-04-01');
    });
  });

  describe('events', () => {
    it('list calls /events', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);

      await sdk.events.list();
      expect(fetch.mock.calls[0][0]).toContain('/v6/customer-portal/events');
    });

    it('get calls /events/{slug}', async () => {
      const fetch = mockFetch(envelope({ id: 1 }));
      vi.stubGlobal('fetch', fetch);

      await sdk.events.get('my-event');
      expect(fetch.mock.calls[0][0]).toContain('/events/my-event');
    });
  });

  describe('members', () => {
    it('getProfile calls GET /profile', async () => {
      const fetch = mockFetch(envelope({ uuid: 'm-1' }));
      vi.stubGlobal('fetch', fetch);

      sdk.setToken('jwt');
      await sdk.members.getProfile();

      const [url, opts] = fetch.mock.calls[0];
      expect(url).toContain('/v6/customer-portal/profile');
      expect(opts.method).toBe('GET');
    });

    it('updateProfile calls PATCH /profile', async () => {
      const fetch = mockFetch(envelope({ uuid: 'm-1' }));
      vi.stubGlobal('fetch', fetch);

      sdk.setToken('jwt');
      await sdk.members.updateProfile({ firstName: 'New' } as any);

      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe('PATCH');
    });
  });

  describe('payments', () => {
    it('createIntent sends POST', async () => {
      const fetch = mockFetch(envelope({ clientSecret: 'cs', paymentIntentId: 'pi' }));
      vi.stubGlobal('fetch', fetch);

      sdk.setToken('jwt');
      await sdk.payments.createIntent({ amount: 100, currency: 'HKD' });

      const [url, opts] = fetch.mock.calls[0];
      expect(url).toContain('/payment-intents');
      expect(opts.method).toBe('POST');
    });
  });

  describe('promotions', () => {
    it('validate sends POST', async () => {
      const fetch = mockFetch(envelope({ isValid: true }));
      vi.stubGlobal('fetch', fetch);

      sdk.setToken('jwt');
      await sdk.promotions.validate({ code: 'SAVE10', channel: 'online', amount: 200 } as any);

      const [url, opts] = fetch.mock.calls[0];
      expect(url).toContain('/validate-promotion');
      expect(opts.method).toBe('POST');
    });
  });
});
