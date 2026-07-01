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

describe('SupportClient', () => {
  let sdk: FavCRM;

  beforeEach(() => {
    sdk = new FavCRM({
      baseUrl: 'https://api.test.com',
      companyId: 'company-123',
    });
  });

  it('config() GETs /support/config', async () => {
    const fetch = mockFetch(envelope({ categories: [], features: { aiEnabled: true, allowAttachments: false } }));
    vi.stubGlobal('fetch', fetch);

    const res = await sdk.support.config();

    expect(fetch.mock.calls[0][0]).toBe('https://api.test.com/v6/customer-portal/support/config');
    expect(fetch.mock.calls[0][1].method).toBe('GET');
    expect(res).toEqual({ categories: [], features: { aiEnabled: true, allowAttachments: false } });
  });

  it('analyze() POSTs the intake body', async () => {
    const payload = {
      analysisSessionId: 'a-1',
      analysis: { type: 'bug', sentiment: 'negative', prioritySuggestion: 'high', summary: 's', suggestedTitle: 't' },
      questions: [],
      canSkip: false,
      isComplete: true,
      round: 1,
      maxRounds: 3,
      aiUsed: true,
    };
    const fetch = mockFetch(envelope(payload));
    vi.stubGlobal('fetch', fetch);

    const res = await sdk.support.analyze({
      sessionId: 's-1',
      feedback: 'Checkout fails',
      visitorData: { email: 'ada@example.com' },
    });

    expect(fetch.mock.calls[0][0]).toBe('https://api.test.com/v6/customer-portal/support/analyze');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      sessionId: 's-1',
      feedback: 'Checkout fails',
      visitorData: { email: 'ada@example.com' },
    });
    expect(res).toEqual(payload);
  });

  it('continue() POSTs answers', async () => {
    const fetch = mockFetch(envelope({ isComplete: false, questions: [] }));
    vi.stubGlobal('fetch', fetch);

    await sdk.support.continue({
      sessionId: 's-1',
      analysisSessionId: 'a-1',
      answers: { q1: 'yes' },
    });

    expect(fetch.mock.calls[0][0]).toBe('https://api.test.com/v6/customer-portal/support/continue');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      sessionId: 's-1',
      analysisSessionId: 'a-1',
      answers: { q1: 'yes' },
    });
  });

  it('submit() POSTs and returns the ticket', async () => {
    const payload = { id: 't-1', ticketNumber: 42, subject: 'Checkout failure', status: 'open' };
    const fetch = mockFetch(envelope(payload));
    vi.stubGlobal('fetch', fetch);

    const res = await sdk.support.submit({ sessionId: 's-1', analysisSessionId: 'a-1', subject: 'Checkout failure' });

    expect(fetch.mock.calls[0][0]).toBe('https://api.test.com/v6/customer-portal/support/submit');
    expect(res).toEqual(payload);
  });

  it('sends X-Company-Id header on support calls', async () => {
    const fetch = mockFetch(envelope({ categories: [], features: { aiEnabled: false, allowAttachments: false } }));
    vi.stubGlobal('fetch', fetch);
    await sdk.support.config();
    expect(fetch.mock.calls[0][1].headers['X-Company-Id']).toBe('company-123');
  });
});
