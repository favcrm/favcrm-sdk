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
      expect(fetch.mock.calls[0][1].headers['X-Company-Id']).toBe('company-123');
    });

    it('does not send Authorization header when no token set', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.listCategories();
      expect(fetch.mock.calls[0][1].headers['Authorization']).toBeUndefined();
    });

    it('sends Authorization header after setToken', async () => {
      const fetch = mockFetch(envelope({}));
      vi.stubGlobal('fetch', fetch);
      sdk.setToken('jwt-abc');
      await sdk.members.getProfile();
      expect(fetch.mock.calls[0][1].headers['Authorization']).toBe('Bearer jwt-abc');
    });

    it('removes Authorization header after clearToken', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      sdk.setToken('jwt-abc');
      sdk.clearToken();
      await sdk.shop.listProducts();
      expect(fetch.mock.calls[0][1].headers['Authorization']).toBeUndefined();
    });

    it('exposes companyId getter', () => {
      expect(sdk.companyId).toBe('company-123');
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

    it('throws FavCRMError on non-OK response with error.message', async () => {
      vi.stubGlobal('fetch', mockFetch(
        { error: { message: 'Not found', code: 'NOT_FOUND' } }, 404,
      ));
      await expect(sdk.shop.getProduct('nope')).rejects.toThrow(FavCRMError);
    });

    it('throws FavCRMError with plain message field', async () => {
      vi.stubGlobal('fetch', mockFetch({ message: 'Bad request' }, 400));
      try {
        await sdk.shop.getProduct('bad');
      } catch (e) {
        expect((e as FavCRMError).message).toBe('Bad request');
        expect((e as FavCRMError).status).toBe(400);
      }
    });

    it('handles non-JSON error body', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 500,
        json: () => Promise.reject(new Error('not json')),
      }));
      try {
        await sdk.shop.listProducts();
      } catch (e) {
        expect((e as FavCRMError).status).toBe(500);
        expect((e as FavCRMError).message).toBe('Request failed');
      }
    });

    it('calls onUnauthorized on 401', async () => {
      const onUnauthorized = vi.fn();
      const authedSdk = new FavCRM({ baseUrl: 'https://api.test.com', companyId: 'c', onUnauthorized });
      vi.stubGlobal('fetch', mockFetch({}, 401));
      await expect(authedSdk.members.getProfile()).rejects.toThrow();
      expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    it('handles 204 No Content', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));
      const result = await sdk.members.deletePaymentMethod('pm-1');
      expect(result).toBeUndefined();
    });

    it('uses custom fetch when provided', async () => {
      const customFetch = mockFetch(envelope({ id: 1 }));
      const customSdk = new FavCRM({ baseUrl: 'https://api.test.com', companyId: 'c', fetch: customFetch });
      await customSdk.shop.listCategories();
      expect(customFetch).toHaveBeenCalledOnce();
    });
  });

  describe('shop', () => {
    it('listProducts with params', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.listProducts({ category_slug: 'incense', search: 'wood', page: 2, limit: 10 });
      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain('category_slug=incense');
      expect(url).toContain('search=wood');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=10');
    });

    it('listProducts without params', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.listProducts();
      expect(fetch.mock.calls[0][0]).toContain('/shop/products');
      expect(fetch.mock.calls[0][0]).not.toContain('?');
    });

    it('getProduct', async () => {
      const fetch = mockFetch(envelope({ id: 1 }));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.getProduct('test-slug');
      expect(fetch.mock.calls[0][0]).toContain('/shop/products/test-slug');
    });

    it('listCategories', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.listCategories();
      expect(fetch.mock.calls[0][0]).toContain('/shop/categories');
    });

    it('listShippingMethods with amount', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.listShippingMethods(500);
      expect(fetch.mock.calls[0][0]).toContain('order_amount=500');
    });

    it('listShippingMethods without amount', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.listShippingMethods();
      expect(fetch.mock.calls[0][0]).not.toContain('order_amount');
    });

    it('listPaymentMethods', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.listPaymentMethods();
      expect(fetch.mock.calls[0][0]).toContain('/shop/payment-methods');
    });

    it('createOrder', async () => {
      const fetch = mockFetch(envelope({ orderId: 'o-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.createOrder({ lineItems: [], customerInfo: { firstName: 'A', lastName: 'B' }, shippingAddress: { addressLine1: '1', city: 'HK' } } as any);
      expect(fetch.mock.calls[0][1].method).toBe('POST');
    });

    it('listOrders', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.listOrders();
      expect(fetch.mock.calls[0][0]).toContain('/shop/orders');
      expect(fetch.mock.calls[0][1].method).toBe('GET');
    });

    it('getOrder', async () => {
      const fetch = mockFetch(envelope({ orderId: 'o-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.shop.getOrder('uuid-1');
      expect(fetch.mock.calls[0][0]).toContain('/shop/orders/uuid-1');
    });
  });

  describe('bookings', () => {
    it('listServices', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.bookings.listServices();
      expect(fetch.mock.calls[0][0]).toContain('/services');
    });

    it('getService', async () => {
      const fetch = mockFetch(envelope({ id: 's-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.bookings.getService('s-1');
      expect(fetch.mock.calls[0][0]).toContain('/services/s-1');
    });

    it('getStaff', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.bookings.getStaff('s-1');
      expect(fetch.mock.calls[0][0]).toContain('/services/s-1/staff');
    });

    it('getTimeSlots with all params', async () => {
      const fetch = mockFetch(envelope({ slots: [] }));
      vi.stubGlobal('fetch', fetch);
      await sdk.bookings.getTimeSlots('s-1', { date: '2026-04-01', createQuotes: true, staffId: 'st-1' });
      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain('/services/s-1/slots');
      expect(url).toContain('date=2026-04-01');
      expect(url).toContain('createQuotes=true');
      expect(url).toContain('staffId=st-1');
    });

    it('create', async () => {
      const fetch = mockFetch(envelope({ id: 'b-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.bookings.create({ serviceId: 's-1' });
      expect(fetch.mock.calls[0][0]).toContain('/bookings');
      expect(fetch.mock.calls[0][1].method).toBe('POST');
    });

    it('createGuest', async () => {
      const fetch = mockFetch(envelope({ id: 'b-2' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.bookings.createGuest({ serviceId: 's-1', guestInfo: {} });
      expect(fetch.mock.calls[0][0]).toContain('/bookings/guest');
    });

    it('list', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.bookings.list({ limit: '3' });
      expect(fetch.mock.calls[0][0]).toContain('/bookings');
      expect(fetch.mock.calls[0][0]).toContain('limit=3');
    });

    it('get', async () => {
      const fetch = mockFetch(envelope({ id: 'b-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.bookings.get('b-1');
      expect(fetch.mock.calls[0][0]).toContain('/bookings/b-1');
    });

    it('getAccessQr', async () => {
      const fetch = mockFetch(envelope({ qrContent: 'qr' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.bookings.getAccessQr('b-1');
      expect(fetch.mock.calls[0][0]).toContain('/bookings/b-1/access-qr');
      expect(fetch.mock.calls[0][1].method).toBe('POST');
    });
  });

  describe('events', () => {
    it('list', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.events.list();
      expect(fetch.mock.calls[0][0]).toContain('/events');
    });

    it('get', async () => {
      const fetch = mockFetch(envelope({ id: 'e-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.events.get('my-event');
      expect(fetch.mock.calls[0][0]).toContain('/events/my-event');
    });

    it('register', async () => {
      const fetch = mockFetch(envelope({ id: 1 }));
      vi.stubGlobal('fetch', fetch);
      await sdk.events.register({ eventSlug: 'ev', guestName: 'A', email: 'a@b.c', phone: '+1' });
      expect(fetch.mock.calls[0][0]).toContain('/event-registrations');
      expect(fetch.mock.calls[0][1].method).toBe('POST');
    });

    it('listRegistrations', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.events.listRegistrations();
      expect(fetch.mock.calls[0][0]).toContain('/event-registrations');
      expect(fetch.mock.calls[0][1].method).toBe('GET');
    });

    it('createPaymentIntent', async () => {
      const fetch = mockFetch(envelope({ clientSecret: 'cs', paymentIntentId: 'pi' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.events.createPaymentIntent('reg-1');
      expect(fetch.mock.calls[0][0]).toContain('/event-registrations/reg-1/payment-intent');
      expect(fetch.mock.calls[0][1].method).toBe('POST');
    });
  });

  describe('members', () => {
    beforeEach(() => sdk.setToken('jwt'));

    it('getProfile', async () => {
      const fetch = mockFetch(envelope({ uuid: 'm-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.members.getProfile();
      expect(fetch.mock.calls[0][0]).toContain('/profile');
    });

    it('updateProfile', async () => {
      const fetch = mockFetch(envelope({ uuid: 'm-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.members.updateProfile({ firstName: 'New' } as any);
      expect(fetch.mock.calls[0][1].method).toBe('PATCH');
    });

    it('getCardSettings', async () => {
      const fetch = mockFetch(envelope({}));
      vi.stubGlobal('fetch', fetch);
      await sdk.members.getCardSettings();
      expect(fetch.mock.calls[0][0]).toContain('/card-settings');
    });

    it('listPaymentMethods', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.members.listPaymentMethods();
      expect(fetch.mock.calls[0][0]).toContain('/payment-methods');
    });

    it('addPaymentMethod', async () => {
      const fetch = mockFetch(envelope({ id: 'pm-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.members.addPaymentMethod('tok_123');
      expect(fetch.mock.calls[0][1].method).toBe('POST');
      expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ token: 'tok_123' });
    });

    it('deletePaymentMethod', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));
      await sdk.members.deletePaymentMethod('pm-1');
      expect(vi.mocked(globalThis.fetch).mock.calls[0][0]).toContain('/payment-methods/pm-1');
      expect(vi.mocked(globalThis.fetch).mock.calls[0][1]!.method).toBe('DELETE');
    });

    it('setDefaultPaymentMethod', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));
      await sdk.members.setDefaultPaymentMethod('pm-1');
      expect(vi.mocked(globalThis.fetch).mock.calls[0][0]).toContain('/payment-methods/pm-1/set-default');
      expect(vi.mocked(globalThis.fetch).mock.calls[0][1]!.method).toBe('POST');
    });
  });

  describe('payments', () => {
    beforeEach(() => sdk.setToken('jwt'));

    it('getGateway', async () => {
      const fetch = mockFetch(envelope({ publishableKey: 'pk', gateway: 'stripe' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.payments.getGateway();
      expect(fetch.mock.calls[0][0]).toContain('/payment-gateway');
    });

    it('createIntent', async () => {
      const fetch = mockFetch(envelope({ clientSecret: 'cs', paymentIntentId: 'pi' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.payments.createIntent({ amount: 100, currency: 'HKD' });
      expect(fetch.mock.calls[0][1].method).toBe('POST');
    });
  });

  describe('promotions', () => {
    it('validate', async () => {
      const fetch = mockFetch(envelope({ isValid: true }));
      vi.stubGlobal('fetch', fetch);
      sdk.setToken('jwt');
      await sdk.promotions.validate({ code: 'SAVE10', channel: 'online', amount: 200 } as any);
      expect(fetch.mock.calls[0][0]).toContain('/validate-promotion');
      expect(fetch.mock.calls[0][1].method).toBe('POST');
    });
  });

  describe('invoices', () => {
    beforeEach(() => sdk.setToken('jwt'));

    it('list', async () => {
      const fetch = mockFetch(envelope([]));
      vi.stubGlobal('fetch', fetch);
      await sdk.invoices.list();
      expect(fetch.mock.calls[0][0]).toContain('/invoices');
    });

    it('get', async () => {
      const fetch = mockFetch(envelope({ id: 'inv-1' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.invoices.get('inv-1');
      expect(fetch.mock.calls[0][0]).toContain('/invoices/inv-1');
    });
  });

  describe('contact', () => {
    it('submit sends POST to /contact', async () => {
      const fetch = mockFetch(envelope({ conversationId: 'conv-1', messageId: 'msg-1' }));
      vi.stubGlobal('fetch', fetch);
      const result = await sdk.contact.submit({
        name: 'Test User',
        email: 'test@example.com',
        phone: '+85291234567',
        subject: 'Fingerprint Analysis Lead',
        message: 'Personality type: Wednesday',
      });
      expect(fetch.mock.calls[0][0]).toContain('/contact');
      expect(fetch.mock.calls[0][1].method).toBe('POST');
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.name).toBe('Test User');
      expect(body.email).toBe('test@example.com');
      expect(body.phone).toBe('+85291234567');
      expect(body.message).toContain('Wednesday');
      expect(result).toEqual({ conversationId: 'conv-1', messageId: 'msg-1' });
    });

    it('submit works without optional fields', async () => {
      const fetch = mockFetch(envelope({ conversationId: 'conv-2', messageId: 'msg-2' }));
      vi.stubGlobal('fetch', fetch);
      await sdk.contact.submit({
        name: 'Minimal',
        email: 'min@test.com',
        message: 'Hello',
      });
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.phone).toBeUndefined();
      expect(body.subject).toBeUndefined();
    });
  });
});
