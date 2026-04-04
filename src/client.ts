import type {
  ProductListItem,
  Product,
  ShopCategory,
  ShippingMethod,
  PaymentMethodOption,
  CreateOrderRequest,
  ShopOrder,
} from "./types/shop.js";
import type {
  ApiEvent,
  EventRegistrationSubmission,
  EventRegistrationResult,
  EventRegistration,
} from "./types/event.js";
import type {
  BookingService,
  TimeSlot,
  Booking,
  BookingDetail,
  BookingConfig,
} from "./types/booking.js";
import type { Member, CardSettings, PaymentMethod } from "./types/member.js";
import type {
  PromotionValidationRequest,
  PromotionValidationResponse,
} from "./types/promotion.js";
import type { Invoice, InvoiceDetail } from "./types/invoice.js";
import type { CmsPage } from "./types/cms.js";
import type { BlogPost, BlogPostListItem } from "./types/blog.js";

// ---------------------------------------------------------------------------
// Config & Error
// ---------------------------------------------------------------------------

export interface FavCRMConfig {
  baseUrl: string;
  companyId: string;
  onUnauthorized?: () => void;
  fetch?: typeof globalThis.fetch;
}

export class FavCRMError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "FavCRMError";
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  body?: unknown;
  params?: Record<string, string>;
}

function toQueryString(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : "";
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------

export class FavCRM {
  private config: FavCRMConfig;
  private jwt: string | null = null;
  private readonly base = "/v6/customer-portal";

  readonly shop: ShopClient;
  readonly bookings: BookingsClient;
  readonly events: EventsClient;
  readonly members: MembersClient;
  readonly payments: PaymentsClient;
  readonly promotions: PromotionsClient;
  readonly invoices: InvoicesClient;
  readonly cms: CmsClient;
  readonly blog: BlogClient;

  constructor(config: FavCRMConfig) {
    this.config = config;
    this.shop = new ShopClient(this);
    this.bookings = new BookingsClient(this);
    this.events = new EventsClient(this);
    this.members = new MembersClient(this);
    this.payments = new PaymentsClient(this);
    this.promotions = new PromotionsClient(this);
    this.invoices = new InvoicesClient(this);
    this.cms = new CmsClient(this);
    this.blog = new BlogClient(this);
  }

  get companyId(): string {
    return this.config.companyId;
  }

  setToken(jwt: string): void {
    this.jwt = jwt;
  }

  clearToken(): void {
    this.jwt = null;
  }

  /** @internal — used by sub-clients */
  async request<T>(
    method: HttpMethod,
    path: string,
    opts?: RequestOptions,
  ): Promise<T> {
    const qs = opts?.params ? toQueryString(opts.params) : "";
    const url = `${this.config.baseUrl}${this.base}${path}${qs}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Company-Id": this.config.companyId,
    };

    if (this.jwt) {
      headers["Authorization"] = `Bearer ${this.jwt}`;
    }

    const fetchFn = this.config.fetch ?? globalThis.fetch;
    const response = await fetchFn(url, {
      method,
      headers,
      body: opts?.body != null ? JSON.stringify(opts.body) : undefined,
    });

    if (response.status === 401) {
      this.config.onUnauthorized?.();
      throw new FavCRMError(401, "Unauthorized");
    }

    if (!response.ok) {
      let message = "Request failed";
      let code: string | undefined;
      try {
        const err = await response.json();
        if (err?.error?.message) {
          message = err.error.message;
          code = err.error.code;
        } else if (err?.message) {
          message =
            typeof err.message === "string"
              ? err.message
              : JSON.stringify(err.message);
        }
      } catch {
        // non-JSON error body
      }
      throw new FavCRMError(response.status, message, code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const json = await response.json();
    // Unwrap { success: true, data: T } envelope
    if (
      json &&
      typeof json === "object" &&
      "success" in json &&
      json.data !== undefined
    ) {
      return json.data as T;
    }
    return json as T;
  }
}

// ---------------------------------------------------------------------------
// Sub-clients
// ---------------------------------------------------------------------------

export interface ProductListParams {
  category_slug?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class ShopClient {
  constructor(private sdk: FavCRM) {}

  listProducts(params?: ProductListParams): Promise<ProductListItem[]> {
    const p: Record<string, string> = {};
    if (params?.category_slug) p.category_slug = params.category_slug;
    if (params?.search) p.search = params.search;
    if (params?.page) p.page = String(params.page);
    if (params?.limit) p.limit = String(params.limit);
    return this.sdk.request("GET", "/shop/products", { params: p });
  }

  getProduct(slug: string): Promise<Product> {
    return this.sdk.request("GET", `/shop/products/${slug}`);
  }

  listCategories(): Promise<ShopCategory[]> {
    return this.sdk.request("GET", "/shop/categories");
  }

  listShippingMethods(orderAmount?: number): Promise<ShippingMethod[]> {
    const p: Record<string, string> = {};
    if (orderAmount !== undefined) p.order_amount = String(orderAmount);
    return this.sdk.request("GET", "/shop/shipping-methods", { params: p });
  }

  listPaymentMethods(): Promise<PaymentMethodOption[]> {
    return this.sdk.request("GET", "/shop/payment-methods");
  }

  createOrder(data: CreateOrderRequest): Promise<ShopOrder> {
    return this.sdk.request("POST", "/shop/orders", { body: data });
  }

  listOrders(): Promise<ShopOrder[]> {
    return this.sdk.request("GET", "/shop/orders");
  }

  getOrder(orderUuid: string): Promise<ShopOrder> {
    return this.sdk.request("GET", `/shop/orders/${orderUuid}`);
  }
}

export interface TimeSlotsParams {
  date: string;
  createQuotes?: boolean;
  accountId?: string;
  staffId?: string;
}

export interface TimeSlotsResponse {
  slots: TimeSlot[];
  bookingConfig?: BookingConfig;
}

export interface StaffMember {
  memberId: string;
  memberName: string;
}

class BookingsClient {
  constructor(private sdk: FavCRM) {}

  listServices(): Promise<BookingService[]> {
    return this.sdk.request("GET", "/services");
  }

  getService(serviceId: string): Promise<BookingService> {
    return this.sdk.request("GET", `/services/${serviceId}`);
  }

  getStaff(serviceId: string): Promise<StaffMember[]> {
    return this.sdk.request("GET", `/services/${serviceId}/staff`);
  }

  async getTimeSlots(
    serviceId: string,
    params: TimeSlotsParams,
  ): Promise<TimeSlotsResponse> {
    const p: Record<string, string> = { date: params.date };
    if (params.createQuotes != null)
      p.createQuotes = String(params.createQuotes);
    if (params.accountId) p.accountId = params.accountId;
    if (params.staffId) p.staffId = params.staffId;
    const res = await this.sdk.request<any>(
      "GET",
      `/services/${serviceId}/slots`,
      { params: p },
    );

    let slots = Array.isArray(res) ? res : res?.slots || [];
    slots = slots.map((slot: any) => ({
      ...slot,
      available: slot.available ?? slot.status === "available",
      remainingCapacity: slot.remainingCapacity ?? slot.availableCapacity ?? 0,
    }));

    if (Array.isArray(res)) {
      return { slots: slots };
    }
    return { ...res, slots } as TimeSlotsResponse;
  }

  create(data: unknown): Promise<Booking> {
    return this.sdk.request("POST", "/bookings", { body: data });
  }

  createGuest(data: unknown): Promise<Booking> {
    return this.sdk.request("POST", "/bookings/guest", { body: data });
  }

  list(params?: Record<string, string>): Promise<Booking[]> {
    return this.sdk.request("GET", "/bookings", { params });
  }

  get(bookingId: string): Promise<BookingDetail> {
    return this.sdk.request("GET", `/bookings/${bookingId}`);
  }

  getAccessQr(
    bookingId: string,
  ): Promise<{ qrContent: string; expiresAt: string; bookingId: string }> {
    return this.sdk.request("POST", `/bookings/${bookingId}/access-qr`);
  }
}

class EventsClient {
  constructor(private sdk: FavCRM) {}

  list(): Promise<ApiEvent[]> {
    return this.sdk.request("GET", "/events");
  }

  get(slug: string): Promise<ApiEvent> {
    return this.sdk.request("GET", `/events/${slug}`);
  }

  register(
    data: EventRegistrationSubmission,
  ): Promise<EventRegistrationResult> {
    return this.sdk.request("POST", "/event-registrations", { body: data });
  }

  listRegistrations(): Promise<EventRegistration[]> {
    return this.sdk.request("GET", "/event-registrations");
  }

  createPaymentIntent(registrationId: string): Promise<PaymentIntentResponse> {
    return this.sdk.request(
      "POST",
      `/event-registrations/${registrationId}/payment-intent`,
    );
  }
}

class MembersClient {
  constructor(private sdk: FavCRM) {}

  getProfile(): Promise<Member> {
    return this.sdk.request("GET", "/profile");
  }

  updateProfile(data: Partial<Member>): Promise<Member> {
    return this.sdk.request("PATCH", "/profile", { body: data });
  }

  getCardSettings(): Promise<CardSettings> {
    return this.sdk.request("GET", "/card-settings");
  }

  listPaymentMethods(): Promise<PaymentMethod[]> {
    return this.sdk.request("GET", "/payment-methods");
  }

  addPaymentMethod(token: string): Promise<PaymentMethod> {
    return this.sdk.request("POST", "/payment-methods", { body: { token } });
  }

  deletePaymentMethod(methodId: string): Promise<void> {
    return this.sdk.request("DELETE", `/payment-methods/${methodId}`);
  }

  setDefaultPaymentMethod(methodId: string): Promise<void> {
    return this.sdk.request("POST", `/payment-methods/${methodId}/set-default`);
  }
}

export interface PaymentGateway {
  publishableKey: string;
  gateway: string;
}

export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  bookingId?: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  publishableKey?: string;
  stripeAccount?: string;
}

class PaymentsClient {
  constructor(private sdk: FavCRM) {}

  getGateway(): Promise<PaymentGateway> {
    return this.sdk.request("GET", "/payment-gateway");
  }

  createIntent(data: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    return this.sdk.request("POST", "/payment-intents", { body: data });
  }
}

class PromotionsClient {
  constructor(private sdk: FavCRM) {}

  validate(
    data: PromotionValidationRequest,
  ): Promise<PromotionValidationResponse> {
    return this.sdk.request("POST", "/validate-promotion", { body: data });
  }
}

class InvoicesClient {
  constructor(private sdk: FavCRM) {}

  list(): Promise<Invoice[]> {
    return this.sdk.request("GET", "/invoices");
  }

  get(id: string): Promise<InvoiceDetail> {
    return this.sdk.request("GET", `/invoices/${id}`);
  }
}

class CmsClient {
  constructor(private sdk: FavCRM) {}

  listPages(): Promise<CmsPage[]> {
    return this.sdk.request("GET", "/cms/pages");
  }

  getPage(slug: string): Promise<CmsPage> {
    return this.sdk.request("GET", `/cms/pages/${slug}`);
  }
}

export interface BlogListParams {
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class BlogClient {
  constructor(private sdk: FavCRM) {}

  list(params?: BlogListParams): Promise<BlogPostListItem[]> {
    const p: Record<string, string> = {};
    if (params?.category) p.category = params.category;
    if (params?.tag) p.tag = params.tag;
    if (params?.search) p.search = params.search;
    if (params?.page) p.page = String(params.page);
    if (params?.limit) p.limit = String(params.limit);
    return this.sdk.request("GET", "/cms/posts", { params: p });
  }

  getBySlug(slug: string): Promise<BlogPost> {
    return this.sdk.request("GET", `/cms/posts/${slug}`);
  }
}
