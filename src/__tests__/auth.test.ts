import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FavCRM } from '../client.js';

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

describe('AuthClient', () => {
  let sdk: FavCRM;

  beforeEach(() => {
    sdk = new FavCRM({
      baseUrl: 'https://api.test.com',
      companyId: 'company-123',
    });
  });

  it('sendOtp posts to /auth/otp with phone + companyId', async () => {
    const fetch = mockFetch(envelope({ message: 'OTP sent' }));
    vi.stubGlobal('fetch', fetch);

    const res = await sdk.auth.sendOtp('+85298765432');

    expect(fetch.mock.calls[0][0]).toBe(
      'https://api.test.com/v6/customer-portal/auth/otp',
    );
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      phone: '+85298765432',
      companyId: 'company-123',
    });
    expect(res).toEqual({ message: 'OTP sent' });
  });

  it('verifyOtp posts to /auth/otp/verify and returns token payload', async () => {
    const payload = {
      token: 'jwt-x',
      accessToken: 'jwt-x',
      memberUuid: 'uuid-1',
      memberName: 'Jane',
      phone: '+85298765432',
    };
    const fetch = mockFetch(envelope(payload));
    vi.stubGlobal('fetch', fetch);

    const res = await sdk.auth.verifyOtp('+85298765432', '123456');

    expect(fetch.mock.calls[0][0]).toBe(
      'https://api.test.com/v6/customer-portal/auth/otp/verify',
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      phone: '+85298765432',
      otp: '123456',
    });
    expect(res).toEqual(payload);
  });

  it('register posts to /auth/register with body + injected companyId', async () => {
    const payload = {
      token: 'jwt-y',
      accessToken: 'jwt-y',
      memberUuid: 'uuid-2',
      memberName: 'John',
      phone: '+85291234567',
    };
    const fetch = mockFetch(envelope(payload));
    vi.stubGlobal('fetch', fetch);

    const res = await sdk.auth.register({
      name: 'John',
      phone: '+85291234567',
      email: 'john@example.com',
    });

    expect(fetch.mock.calls[0][0]).toBe(
      'https://api.test.com/v6/customer-portal/auth/register',
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      name: 'John',
      phone: '+85291234567',
      email: 'john@example.com',
      companyId: 'company-123',
    });
    expect(res).toEqual(payload);
  });

  it('sends X-Company-Id header on auth calls', async () => {
    const fetch = mockFetch(envelope({ message: 'ok' }));
    vi.stubGlobal('fetch', fetch);
    await sdk.auth.sendOtp('+85298765432');
    expect(fetch.mock.calls[0][1].headers['X-Company-Id']).toBe('company-123');
  });
});
