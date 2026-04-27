import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initAnalytics,
  trackPageView,
  trackPurchase,
  trackSignUp,
  trackLogin,
  trackBookingComplete,
  captureUtmParams,
  __resetForTesting,
} from "../analytics.js";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function makeMockDoc() {
  const injectedIds = new Set<string>();

  const mockHead = { appendChild: vi.fn((el: { id?: string }) => { if (el.id) injectedIds.add(el.id); }) };
  const mockBody = { insertAdjacentElement: vi.fn() };

  const mockDoc = {
    getElementById: vi.fn((id: string) => (injectedIds.has(id) ? { id } : null)),
    createElement: vi.fn((_tag: string) => ({
      id: "",
      src: "",
      async: false,
      height: "",
      width: "",
      style: { display: "", visibility: "" },
      appendChild: vi.fn(),
    })),
    head: mockHead,
    body: mockBody,
  };

  return mockDoc;
}

function makeMockWindow(locationSearch = "") {
  return {
    dataLayer: undefined as Record<string, unknown>[] | undefined,
    gtag: undefined as ((...args: unknown[]) => void) | undefined,
    fbq: undefined as unknown,
    _fbq: undefined as unknown,
    location: { search: locationSearch },
  };
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  __resetForTesting();
  vi.stubGlobal("window", makeMockWindow());
  vi.stubGlobal("document", makeMockDoc());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── initAnalytics ────────────────────────────────────────────────────────────

describe("initAnalytics", () => {
  it("no-ops on null config", () => {
    initAnalytics(null);
    expect(window.dataLayer).toBeUndefined();
  });

  it("injects GTM script when gtmId provided", () => {
    initAnalytics({ gtmId: "GTM-TEST", ga4Id: null, metaPixelId: null });
    expect(document.createElement).toHaveBeenCalled();
    expect(document.head.appendChild).toHaveBeenCalled();
    expect(window.dataLayer).toBeDefined();
    expect(window.dataLayer![0]).toMatchObject({ event: "gtm.js" });
  });

  it("injects GA4 directly when no GTM", () => {
    initAnalytics({ gtmId: null, ga4Id: "G-TEST", metaPixelId: null });
    expect(document.head.appendChild).toHaveBeenCalled();
    expect(window.gtag).toBeTypeOf("function");
  });

  it("skips GA4 direct when GTM is configured (GTM manages GA4)", () => {
    const mockDoc = makeMockDoc();
    vi.stubGlobal("document", mockDoc);

    initAnalytics({ gtmId: "GTM-TEST", ga4Id: "G-TEST", metaPixelId: null });

    const ids = mockDoc.createElement.mock.calls.map(
      (_args: unknown[], i: number) => mockDoc.createElement.mock.results[i]?.value?.id ?? ""
    );
    expect(ids.some((id: string) => id === "ga4-script")).toBe(false);
  });

  it("injects Meta Pixel when metaPixelId provided", () => {
    initAnalytics({ gtmId: null, ga4Id: null, metaPixelId: "111222333" });
    expect(window.fbq).toBeTypeOf("function");
  });

  it("is idempotent for GTM (no double inject)", () => {
    initAnalytics({ gtmId: "GTM-TEST", ga4Id: null, metaPixelId: null });
    const callCount = (document.head.appendChild as ReturnType<typeof vi.fn>).mock.calls.length;
    initAnalytics({ gtmId: "GTM-TEST", ga4Id: null, metaPixelId: null });
    expect((document.head.appendChild as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
  });

  it("is idempotent for GA4 (no double inject)", () => {
    initAnalytics({ gtmId: null, ga4Id: "G-TEST", metaPixelId: null });
    const callCount = (document.head.appendChild as ReturnType<typeof vi.fn>).mock.calls.length;
    initAnalytics({ gtmId: null, ga4Id: "G-TEST", metaPixelId: null });
    expect((document.head.appendChild as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
  });

  it("is idempotent for Meta Pixel (skips if fbq already set)", () => {
    initAnalytics({ gtmId: null, ga4Id: null, metaPixelId: "111" });
    const fbqFirst = window.fbq;
    initAnalytics({ gtmId: null, ga4Id: null, metaPixelId: "222" });
    expect(window.fbq).toBe(fbqFirst);
  });
});

// ─── SSR safety ───────────────────────────────────────────────────────────────

describe("SSR safety", () => {
  it("initAnalytics is a no-op when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(() => initAnalytics({ gtmId: "GTM-X", ga4Id: null, metaPixelId: null })).not.toThrow();
  });

  it("trackPageView is a no-op when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(() => trackPageView("/test")).not.toThrow();
  });

  it("captureUtmParams returns empty object when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(captureUtmParams()).toEqual({});
  });
});

// ─── trackPageView ────────────────────────────────────────────────────────────

describe("trackPageView", () => {
  it("no-ops before init", () => {
    trackPageView("/test");
    expect(window.dataLayer).toBeUndefined();
  });

  it("pushes page_view to dataLayer", () => {
    initAnalytics({ gtmId: "GTM-TEST", ga4Id: null, metaPixelId: null });
    window.dataLayer = [];
    trackPageView("/about");
    expect(window.dataLayer).toContainEqual({ event: "page_view", page_path: "/about" });
  });

  it("calls fbq PageView when pixel active", () => {
    initAnalytics({ gtmId: null, ga4Id: null, metaPixelId: "111" });
    const fbqSpy = vi.fn();
    (window as unknown as Record<string, unknown>).fbq = fbqSpy;
    trackPageView("/contact");
    expect(fbqSpy).toHaveBeenCalledWith("track", "PageView");
  });
});

// ─── trackPurchase ────────────────────────────────────────────────────────────

describe("trackPurchase", () => {
  const purchaseData = {
    orderId: "ORD-001",
    value: 299.00,
    currency: "HKD",
    items: [{ id: "SKU-1", name: "Facial", quantity: 1, price: 299.00 }],
  };

  it("no-ops before init", () => {
    trackPurchase(purchaseData);
    expect(window.dataLayer).toBeUndefined();
  });

  it("pushes purchase ecommerce event to dataLayer", () => {
    initAnalytics({ gtmId: "GTM-TEST", ga4Id: null, metaPixelId: null });
    window.dataLayer = [];
    trackPurchase(purchaseData);

    const event = window.dataLayer.find((e) => e.event === "purchase");
    expect(event).toBeDefined();
    expect((event!.ecommerce as Record<string, unknown>).transaction_id).toBe("ORD-001");
    expect((event!.ecommerce as Record<string, unknown>).value).toBe(299.00);
  });

  it("calls fbq Purchase when pixel active", () => {
    initAnalytics({ gtmId: null, ga4Id: null, metaPixelId: "111" });
    const fbqSpy = vi.fn();
    (window as unknown as Record<string, unknown>).fbq = fbqSpy;
    trackPurchase(purchaseData);
    expect(fbqSpy).toHaveBeenCalledWith("track", "Purchase", expect.objectContaining({
      value: 299.00,
      currency: "HKD",
    }));
  });
});

// ─── trackSignUp ──────────────────────────────────────────────────────────────

describe("trackSignUp", () => {
  it("no-ops before init", () => {
    trackSignUp();
    expect(window.dataLayer).toBeUndefined();
  });

  it("pushes sign_up to dataLayer", () => {
    initAnalytics({ gtmId: "GTM-TEST", ga4Id: null, metaPixelId: null });
    window.dataLayer = [];
    trackSignUp();
    expect(window.dataLayer).toContainEqual({ event: "sign_up" });
  });

  it("calls fbq Lead when pixel active", () => {
    initAnalytics({ gtmId: null, ga4Id: null, metaPixelId: "111" });
    const fbqSpy = vi.fn();
    (window as unknown as Record<string, unknown>).fbq = fbqSpy;
    trackSignUp();
    expect(fbqSpy).toHaveBeenCalledWith("track", "Lead");
  });
});

// ─── trackLogin ───────────────────────────────────────────────────────────────

describe("trackLogin", () => {
  it("no-ops before init", () => {
    trackLogin();
    expect(window.dataLayer).toBeUndefined();
  });

  it("pushes login to dataLayer", () => {
    initAnalytics({ gtmId: "GTM-TEST", ga4Id: null, metaPixelId: null });
    window.dataLayer = [];
    trackLogin();
    expect(window.dataLayer).toContainEqual({ event: "login" });
  });
});

// ─── trackBookingComplete ─────────────────────────────────────────────────────

describe("trackBookingComplete", () => {
  it("no-ops before init", () => {
    trackBookingComplete();
    expect(window.dataLayer).toBeUndefined();
  });

  it("pushes booking_complete to dataLayer", () => {
    initAnalytics({ gtmId: "GTM-TEST", ga4Id: null, metaPixelId: null });
    window.dataLayer = [];
    trackBookingComplete();
    expect(window.dataLayer).toContainEqual({ event: "booking_complete" });
  });
});

// ─── captureUtmParams ─────────────────────────────────────────────────────────

describe("captureUtmParams", () => {
  it("returns empty object when no UTM params", () => {
    expect(captureUtmParams()).toEqual({});
  });

  it("captures all UTM params", () => {
    vi.stubGlobal(
      "window",
      makeMockWindow("?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_term=facial&utm_content=banner")
    );
    expect(captureUtmParams()).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "summer",
      utm_term: "facial",
      utm_content: "banner",
    });
  });

  it("returns only present params", () => {
    vi.stubGlobal("window", makeMockWindow("?utm_source=email&utm_medium=newsletter"));
    const result = captureUtmParams();
    expect(result).toEqual({ utm_source: "email", utm_medium: "newsletter" });
    expect(result.utm_campaign).toBeUndefined();
  });
});
