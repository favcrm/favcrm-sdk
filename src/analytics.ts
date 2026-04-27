import type { AnalyticsConfig } from "./types/portal.js";

export type { AnalyticsConfig };

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (...args: unknown[]) => void;
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

interface FbqFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push: FbqFunction;
}

// ─── Module state ─────────────────────────────────────────────────────────────

let _config: AnalyticsConfig | null = null;

function isActive(): boolean {
  return typeof window !== "undefined" && _config !== null;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initAnalytics(config: AnalyticsConfig | null): void {
  if (!config) return;
  _config = config;

  if (config.gtmId) {
    injectGtm(config.gtmId);
  } else if (config.ga4Id) {
    injectGa4(config.ga4Id);
  }

  if (config.metaPixelId) {
    injectMetaPixel(config.metaPixelId);
  }
}

function injectGtm(gtmId: string): void {
  if (typeof window === "undefined") return;
  if (document.getElementById("gtm-script")) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  const script = document.createElement("script");
  script.id = "gtm-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(script);

  const noscript = document.createElement("noscript");
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
  iframe.height = "0";
  iframe.width = "0";
  iframe.style.display = "none";
  iframe.style.visibility = "hidden";
  noscript.appendChild(iframe);
  document.body.insertAdjacentElement("afterbegin", noscript);
}

function injectGa4(ga4Id: string): void {
  if (typeof window === "undefined") return;
  if (document.getElementById("ga4-script")) return;

  const script = document.createElement("script");
  script.id = "ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer.push(args as unknown as Record<string, unknown>);
  };
  window.gtag("js", new Date());
  window.gtag("config", ga4Id);
}

function injectMetaPixel(pixelId: string): void {
  if (typeof window === "undefined" || window.fbq) return;

  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue.push(args);
    }
  }) as FbqFunction;

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;

  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq("init", pixelId);
}

// ─── Page tracking ────────────────────────────────────────────────────────────

export function trackPageView(path: string): void {
  if (!isActive()) return;

  if (window.dataLayer) {
    window.dataLayer.push({ event: "page_view", page_path: path });
  }

  if (window.fbq) {
    window.fbq("track", "PageView");
  }
}

// ─── Conversion events ────────────────────────────────────────────────────────

export interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PurchaseData {
  orderId: string;
  value: number;
  currency: string;
  items: PurchaseItem[];
}

export function trackPurchase(data: PurchaseData): void {
  if (!isActive()) return;

  if (window.dataLayer) {
    window.dataLayer.push({
      event: "purchase",
      ecommerce: {
        transaction_id: data.orderId,
        value: data.value,
        currency: data.currency,
        items: data.items.map((item, index) => ({
          item_id: item.id,
          item_name: item.name,
          quantity: item.quantity,
          price: item.price,
          index,
        })),
      },
    });
  }

  if (window.fbq) {
    window.fbq("track", "Purchase", {
      value: data.value,
      currency: data.currency,
      content_ids: data.items.map((i) => i.id),
      content_type: "product",
    });
  }
}

export function trackSignUp(): void {
  if (!isActive()) return;

  if (window.dataLayer) {
    window.dataLayer.push({ event: "sign_up" });
  }

  if (window.fbq) {
    window.fbq("track", "Lead");
  }
}

export function trackLogin(): void {
  if (!isActive()) return;

  if (window.dataLayer) {
    window.dataLayer.push({ event: "login" });
  }
}

export function trackBookingComplete(): void {
  if (!isActive()) return;

  if (window.dataLayer) {
    window.dataLayer.push({ event: "booking_complete" });
  }
}

// ─── UTM capture ──────────────────────────────────────────────────────────────

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export function captureUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const result: UtmParams = {};

  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ] as const;

  for (const key of keys) {
    const value = params.get(key);
    if (value) result[key] = value;
  }

  return result;
}

// ─── Test helper ──────────────────────────────────────────────────────────────

export function __resetForTesting(): void {
  _config = null;
}
