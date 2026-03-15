import type { RegistrationSubmission, RegistrationResult } from './types/member.js';
import type { EventListItem, EventDetail, EventRegistrationSubmission, EventRegistrationResult } from './types/event.js';
import type { CouponClaimSubmission, CouponClaimResult } from './types/portal.js';
import type {
  Product,
  ProductListItem,
  ShopCategory,
  ShippingMethod,
  CreateOrderRequest,
  ShopOrder,
} from './types/shop.js';
import type { PromotionValidationRequest, PromotionValidationResponse } from './types/promotion.js';

export interface FavCRMConfig {
  baseUrl: string;
  brandUuid: string;
  portalToken?: string;
  locale?: string;
}

export class FavCRMError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'FavCRMError';
    this.code = code;
    this.details = details;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class FavCRMClient {
  private config: FavCRMConfig;
  private readonly brandPath: string;

  constructor(config: FavCRMConfig) {
    this.config = config;
    this.brandPath = `/v6/member-portal/brands/${config.brandUuid}`;
  }

  async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (body != null) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.config.portalToken) {
      headers['X-Portal-Token'] = this.config.portalToken;
    }

    if (this.config.locale) {
      headers['Accept-Language'] = this.config.locale;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new FavCRMError(
        'NETWORK_ERROR',
        err instanceof Error ? err.message : 'Network request failed',
      );
    }

    if (!response.ok) {
      let errorBody: Record<string, unknown> | undefined;
      try {
        errorBody = await response.json() as Record<string, unknown>;
      } catch {
        // response body is not JSON
      }
      throw new FavCRMError(
        `HTTP_${response.status}`,
        (errorBody?.message as string) ?? (errorBody?.detail as string) ?? response.statusText,
        errorBody,
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    try {
      return await response.json() as T;
    } catch {
      throw new FavCRMError('PARSE_ERROR', 'Failed to parse response JSON');
    }
  }

  // --- Public portal submission endpoints ---

  async submitRegistration(data: RegistrationSubmission): Promise<RegistrationResult> {
    return this.request<RegistrationResult>('POST', `${this.brandPath}/registration/`, data);
  }

  async submitEventRegistration(data: EventRegistrationSubmission): Promise<EventRegistrationResult> {
    return this.request<EventRegistrationResult>('POST', `${this.brandPath}/events/${data.eventSlug}/register/`, data);
  }

  async createOrder(data: CreateOrderRequest): Promise<ShopOrder> {
    return this.request<ShopOrder>('POST', `${this.brandPath}/shop/orders/`, data);
  }

  async claimCoupon(data: CouponClaimSubmission): Promise<CouponClaimResult> {
    return this.request<CouponClaimResult>('POST', `${this.brandPath}/claim-coupon/`, data);
  }

  async validatePromotion(data: PromotionValidationRequest): Promise<PromotionValidationResponse> {
    return this.request<PromotionValidationResponse>('POST', `${this.brandPath}/validate-promotion/`, data);
  }

  // --- Public read endpoints (no auth needed) ---

  async getProducts(params?: ProductListParams): Promise<ProductListItem[]> {
    const qs = params ? `?${new URLSearchParams(toStringRecord(params))}` : '';
    return this.request<ProductListItem[]>('GET', `${this.brandPath}/shop/products/${qs}`);
  }

  async getProduct(slug: string): Promise<Product> {
    return this.request<Product>('GET', `${this.brandPath}/shop/products/${slug}/`);
  }

  async getCategories(): Promise<ShopCategory[]> {
    return this.request<ShopCategory[]>('GET', `${this.brandPath}/shop/categories/`);
  }

  async getShippingMethods(): Promise<ShippingMethod[]> {
    return this.request<ShippingMethod[]>('GET', `${this.brandPath}/shop/shipping-methods/`);
  }

  async getEvents(): Promise<EventListItem[]> {
    return this.request<EventListItem[]>('GET', `${this.brandPath}/events/`);
  }

  async getEvent(slug: string): Promise<EventDetail> {
    return this.request<EventDetail>('GET', `${this.brandPath}/events/${slug}/`);
  }
}

export interface ProductListParams {
  category?: string;
  search?: string;
  ordering?: string;
  page?: number;
  pageSize?: number;
}

function toStringRecord(obj: object): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value != null) {
      result[key] = String(value);
    }
  }
  return result;
}
