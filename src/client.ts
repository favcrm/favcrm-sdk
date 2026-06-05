import type {
  ProductListItem,
  Product,
  ShopCategory,
  ShopBrand,
  ShopCollection,
  ShippingMethod,
  PaymentMethodOption,
  CreateOrderRequest,
  ShopOrder,
  ShopOrderPaymentStatus,
  ShopOffer,
  ShopOfferListParams,
} from "./types/shop.js";
import type {
  ApiEvent,
  EventRegistrationSubmission,
  EventRegistrationResult,
  EventRegistration,
  EventRegistrationAccess,
  EventPaymentMethod,
  EventPaymentSessionRequest,
  EventPaymentSession,
} from "./types/event.js";
import type {
  BookingService,
  TimeSlot,
  Booking,
  BookingDetail,
  BookingConfig,
  ResourceItem,
  CreateBookingRequest,
  BookingListParams,
  UpdateBookingInput,
} from "./types/booking.js";
import type { Member, CardSettings, PaymentMethod, PublicMembershipTier } from "./types/member.js";
import type {
  PromotionValidationRequest,
  PromotionValidationResponse,
} from "./types/promotion.js";
import type { Invoice, InvoiceDetail } from "./types/invoice.js";
import type {
  DocumentSigningData,
  DocumentSignaturePayload,
  DocumentSignatureResult,
} from "./types/document.js";
import type {
  SurveyPublicView,
  SurveyResponseResult,
  SurveyResponseSubmission,
} from "./types/survey.js";
import type { CmsPage, CmsPageSummary } from "./types/cms.js";
import type { BlogPost, BlogPostListItem } from "./types/blog.js";
import type { ProductReview, ReviewSummary, CreateReviewRequest, ReviewContext } from "./types/review.js";
import type { ServicePackageOrder } from "./types/service-package.js";
import type { ContactEnquirySubmission, ContactEnquiryResult } from "./types/contact.js";
import type {
  ApiGiftOffer,
  ApiGiftOfferList,
  ApiRewardRedemption,
  ApiRewardRedemptionList,
  RedemptionStatus,
} from "./types/gift.js";
import { AuthClient } from "./auth.js";

// ---------------------------------------------------------------------------
// Config & Error
// ---------------------------------------------------------------------------

export interface FavCRMConfig {
  baseUrl: string;
  companyId: string;
  onUnauthorized?: () => void;
  fetch?: typeof globalThis.fetch;
}

export interface CustomerAiChatInput {
  message: string;
  conversationId?: string;
}

export interface CustomerAiToolCallStatus {
  id: string;
  name: string;
  status: "running" | "completed" | "failed";
  summary?: string;
}

export interface CustomerAiUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface CustomerAiStreamHandlers {
  onMessageStart?: (event: { conversationId: string }) => void;
  onContentDelta?: (event: { content: string }) => void;
  onToolCallStart?: (event: { toolCall: CustomerAiToolCallStatus }) => void;
  onToolCallResult?: (event: { toolCall: CustomerAiToolCallStatus }) => void;
  onMessageEnd?: (event: { conversationId: string; usage?: CustomerAiUsage }) => void;
  onError?: (event: { message: string }) => void;
}

export interface CustomerAiConversation {
  id: string;
  title?: string | null;
  type?: string | null;
  createdAt?: string;
  updatedAt?: string;
  messages?: Array<{
    id?: string;
    role: string;
    content: string | null;
    toolCalls?: unknown;
    createdAt?: string;
  }>;
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

interface SseFrame {
  event: string;
  data: unknown;
}

function toQueryString(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : "";
}

function parseSseFrame(frame: string): SseFrame | null {
  let event = "message";
  let rawData = "";

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) rawData += line.slice(5).trim();
  }

  if (!rawData) return null;

  try {
    return { event, data: JSON.parse(rawData) };
  } catch {
    return { event, data: { message: rawData } };
  }
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
  readonly documents: DocumentsClient;
  readonly cms: CmsClient;
  readonly blog: BlogClient;
  readonly packages: PackagesClient;
  readonly tiers: TiersClient;
  readonly contact: ContactClient;
  readonly auth: AuthClient;
  readonly walletPasses: WalletPassesClient;
  readonly gifts: GiftsClient;
  readonly surveys: SurveysClient;
  readonly ai: CustomerAiClient;

  constructor(config: FavCRMConfig) {
    this.config = config;
    this.auth = new AuthClient(this);
    this.shop = new ShopClient(this);
    this.bookings = new BookingsClient(this);
    this.events = new EventsClient(this);
    this.members = new MembersClient(this);
    this.payments = new PaymentsClient(this);
    this.promotions = new PromotionsClient(this);
    this.invoices = new InvoicesClient(this);
    this.documents = new DocumentsClient(this);
    this.cms = new CmsClient(this);
    this.blog = new BlogClient(this);
    this.packages = new PackagesClient(this);
    this.tiers = new TiersClient(this);
    this.contact = new ContactClient(this);
    this.walletPasses = new WalletPassesClient(this);
    this.gifts = new GiftsClient(this);
    this.surveys = new SurveysClient(this);
    this.ai = new CustomerAiClient(this);
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

  /** @internal — used by WalletPassesClient for binary downloads */
  async fetchRaw(path: string, opts?: { params?: Record<string, string> }): Promise<Response> {
    const qs = opts?.params ? toQueryString(opts.params) : "";
    const url = `${this.config.baseUrl}${this.base}${path}${qs}`;
    const headers: Record<string, string> = {
      "X-Company-Id": this.config.companyId,
    };
    if (this.jwt) headers["Authorization"] = `Bearer ${this.jwt}`;
    const fetchFn = this.config.fetch ?? globalThis.fetch;
    const response = await fetchFn(url, { method: "GET", headers });
    if (response.status === 401) {
      this.config.onUnauthorized?.();
      throw new FavCRMError(401, "Unauthorized");
    }
    if (!response.ok) throw new FavCRMError(response.status, response.statusText);
    return response;
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

  /** @internal — used by CustomerAiClient for SSE streams */
  async requestRaw(
    method: HttpMethod,
    path: string,
    opts?: RequestOptions,
  ): Promise<Response> {
    const qs = opts?.params ? toQueryString(opts.params) : "";
    const url = `${this.config.baseUrl}${this.base}${path}${qs}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "X-Company-Id": this.config.companyId,
    };
    if (this.jwt) headers["Authorization"] = `Bearer ${this.jwt}`;
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
    if (!response.ok) throw new FavCRMError(response.status, response.statusText);
    return response;
  }
}

class CustomerAiClient {
  constructor(private sdk: FavCRM) {}

  chat(input: CustomerAiChatInput): Promise<unknown> {
    return this.sdk.request("POST", "/ai/chat", {
      body: {
        message: input.message,
        conversation_id: input.conversationId,
      },
    });
  }

  async streamChat(
    input: CustomerAiChatInput,
    handlers: CustomerAiStreamHandlers,
  ): Promise<void> {
    const response = await this.sdk.requestRaw("POST", "/ai/chat/stream", {
      body: {
        message: input.message,
        conversation_id: input.conversationId,
      },
    });
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const dispatch = (event: string, data: unknown) => {
      switch (event) {
        case "message_start":
          handlers.onMessageStart?.(data as { conversationId: string });
          break;
        case "content_delta":
          handlers.onContentDelta?.(data as { content: string });
          break;
        case "tool_call_start":
          handlers.onToolCallStart?.(data as { toolCall: CustomerAiToolCallStatus });
          break;
        case "tool_call_result":
          handlers.onToolCallResult?.(data as { toolCall: CustomerAiToolCallStatus });
          break;
        case "message_end":
          handlers.onMessageEnd?.(data as { conversationId: string; usage?: CustomerAiUsage });
          break;
        case "error":
          handlers.onError?.(data as { message: string });
          break;
      }
    };

    const flush = (chunk: string) => {
      buffer += chunk;
      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        const parsed = parseSseFrame(frame);
        if (parsed) dispatch(parsed.event, parsed.data);
        separator = buffer.indexOf("\n\n");
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      flush(decoder.decode(value, { stream: true }));
    }
    flush(decoder.decode());
  }

  listConversations(): Promise<CustomerAiConversation[]> {
    return this.sdk.request("GET", "/ai/conversations");
  }

  getConversation(id: string): Promise<CustomerAiConversation> {
    return this.sdk.request("GET", `/ai/conversations/${id}`);
  }

  deleteConversation(id: string): Promise<{ deleted: boolean }> {
    return this.sdk.request("DELETE", `/ai/conversations/${id}`);
  }
}

// ---------------------------------------------------------------------------
// Sub-clients
// ---------------------------------------------------------------------------

export interface ProductListParams {
  category_slug?: string;
  category_id?: number;
  brand_slug?: string;
  collection_slug?: string;
  search?: string;
  sort?: 'name' | 'price_asc' | 'price_desc' | 'newest';
  featured?: boolean;
  page?: number;
  limit?: number;
}

export interface CategoryListParams {
  featured?: boolean;
}

class ShopClient {
  constructor(private sdk: FavCRM) {}

  listProducts(params?: ProductListParams): Promise<ProductListItem[]> {
    const p: Record<string, string> = {};
    if (params?.category_slug) p.category_slug = params.category_slug;
    if (params?.category_id !== undefined) p.category_id = String(params.category_id);
    if (params?.brand_slug) p.brand_slug = params.brand_slug;
    if (params?.collection_slug) p.collection_slug = params.collection_slug;
    if (params?.search) p.search = params.search;
    if (params?.sort) p.sort = params.sort;
    if (params?.featured !== undefined) p.featured = String(params.featured);
    if (params?.page) p.page = String(params.page);
    if (params?.limit) p.limit = String(params.limit);
    return this.sdk.request("GET", "/shop/products", { params: p });
  }

  getProduct(slug: string): Promise<Product> {
    return this.sdk.request("GET", `/shop/products/${slug}`);
  }

  getRelatedProducts(
    slug: string,
    limit: number = 4,
  ): Promise<ProductListItem[]> {
    return this.sdk.request("GET", `/shop/products/${slug}/related`, {
      params: { limit: String(limit) },
    });
  }

  listCategories(params?: CategoryListParams): Promise<ShopCategory[]> {
    const p: Record<string, string> = {};
    if (params?.featured !== undefined) p.featured = String(params.featured);
    return this.sdk.request("GET", "/shop/categories", { params: p });
  }

  listBrands(): Promise<ShopBrand[]> {
    return this.sdk.request("GET", "/shop/brands");
  }

  getBrand(slug: string): Promise<ShopBrand> {
    return this.sdk.request("GET", `/shop/brands/${slug}`);
  }

  listCollections(): Promise<ShopCollection[]> {
    return this.sdk.request("GET", "/shop/collections");
  }

  getCollection(slug: string): Promise<ShopCollection> {
    return this.sdk.request("GET", `/shop/collections/${slug}`);
  }

  listShippingMethods(orderAmount?: number): Promise<ShippingMethod[]> {
    const p: Record<string, string> = {};
    if (orderAmount !== undefined) p.order_amount = String(orderAmount);
    return this.sdk.request("GET", "/shop/shipping-methods", { params: p });
  }

  listPaymentMethods(): Promise<PaymentMethodOption[]> {
    return this.sdk.request("GET", "/shop/payment-methods");
  }

  listOffers(params?: ShopOfferListParams): Promise<ShopOffer[]> {
    const p: Record<string, string> = {};
    if (params?.context) p.context = params.context;
    if (params?.productId !== undefined) p.productId = String(params.productId);
    if (params?.productIds && params.productIds.length > 0) p.productIds = params.productIds.join(",");
    if (params?.categoryId !== undefined) p.categoryId = String(params.categoryId);
    if (params?.total !== undefined) p.total = String(params.total);
    return this.sdk.request("GET", "/offers", { params: p });
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

  getOrderPaymentStatus(orderUuid: string): Promise<ShopOrderPaymentStatus> {
    return this.sdk.request("GET", `/shop/orders/${orderUuid}/payment-status`);
  }

  listProductReviews(slug: string): Promise<{ reviews: ProductReview[]; summary: ReviewSummary }> {
    return this.sdk.request("GET", `/shop/products/${slug}/reviews`);
  }

  getReviewContext(token: string): Promise<ReviewContext> {
    return this.sdk.request("GET", `/shop/reviews/context/${token}`);
  }

  submitProductReview(data: CreateReviewRequest): Promise<ProductReview> {
    return this.sdk.request("POST", "/shop/reviews/submit", { body: data });
  }
}

export interface TimeSlotsParams {
  date: string;
  createQuotes?: boolean;
  accountId?: string;
  staffId?: string;
  resourceId?: string;
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

  getResources(serviceId: string): Promise<ResourceItem[]> {
    return this.sdk.request("GET", `/services/${serviceId}/resources`);
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
    if (params.resourceId) p.resourceId = params.resourceId;
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

  create(data: CreateBookingRequest): Promise<Booking> {
    return this.sdk.request("POST", "/bookings", { body: data });
  }

  createGuest(data: CreateBookingRequest): Promise<Booking> {
    return this.sdk.request("POST", "/bookings/guest", { body: data });
  }

  async list(params?: BookingListParams): Promise<Booking[]> {
    const res = await this.sdk.request<any>("GET", "/bookings", { params: params as Record<string, string> });
    // API returns paginated { items, pagination } — extract the array
    return Array.isArray(res) ? res : res?.items ?? [];
  }

  get(bookingId: string): Promise<BookingDetail> {
    return this.sdk.request("GET", `/bookings/${bookingId}`);
  }

  getAccessQr(
    bookingId: string,
  ): Promise<{ qrContent: string; expiresAt: string; bookingId: string }> {
    return this.sdk.request("POST", `/bookings/${bookingId}/access-qr`);
  }
  cancel(bookingId: string, reason?: string): Promise<BookingDetail> {
    return this.sdk.request("POST", `/bookings/${bookingId}/cancel`, {
      body: { reason },
    });
  }

  reschedule(bookingId: string, data: UpdateBookingInput): Promise<BookingDetail> {
    return this.sdk.request("POST", `/bookings/${bookingId}/reschedule`, {
      body: data,
    });
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

  listPaymentMethods(): Promise<EventPaymentMethod[]> {
    return this.sdk.request("GET", "/event-payment-methods");
  }

  createPaymentSession(
    registrationId: string,
    data: EventPaymentSessionRequest,
  ): Promise<EventPaymentSession> {
    return this.sdk.request(
      "POST",
      `/event-registrations/${registrationId}/payment`,
      { body: data },
    );
  }

  /**
   * Create a payment intent and guarantee a Stripe `publishableKey`.
   *
   * `createPaymentIntent` may omit `publishableKey` depending on the
   * merchant's gateway configuration. This helper falls back to
   * `payments.getGateway()` so the caller always has the key needed to
   * mount Stripe Elements client-side.
   */
  async startPayment(
    registrationId: string,
  ): Promise<PaymentIntentResponse & { publishableKey: string }> {
    const intent = await this.createPaymentIntent(registrationId);
    if (intent.publishableKey) {
      return intent as PaymentIntentResponse & { publishableKey: string };
    }
    const gateway = await this.sdk.payments.getGateway();
    return { ...intent, publishableKey: gateway.publishableKey };
  }

  getAccess(registrationId: string): Promise<EventRegistrationAccess> {
    return this.sdk.request("GET", `/event-registrations/${registrationId}/access`);
  }
  cancelRegistration(eventId: string, registrationId: string): Promise<{ cancelled: boolean }> {
    return this.sdk.request("DELETE", `/events/${eventId}/registrations/${registrationId}`);
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

  enroll(tierId: string): Promise<{ membershipId: string }> {
    return this.sdk.request("POST", "/membership/enroll", { body: { tierId } });
  }

  enrollPaid(
    tierId: string,
    paymentIntentId: string,
  ): Promise<{ membershipId: string }> {
    return this.sdk.request("POST", "/membership/enroll-paid", {
      body: { tierId, paymentIntentId },
    });
  }
}

class TiersClient {
  constructor(private sdk: FavCRM) {}

  list(): Promise<PublicMembershipTier[]> {
    return this.sdk.request("GET", "/membership-tiers");
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
  tierId?: string;
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

  getCreditBalance(): Promise<{ credits: string; currency: string }> {
    return this.sdk.request("GET", "/credit-balance");
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

class DocumentsClient {
  constructor(private sdk: FavCRM) {}

  getSigningToken(token: string): Promise<DocumentSigningData> {
    return this.sdk.request("GET", `/document-signing/${token}`);
  }

  sign(
    token: string,
    data: DocumentSignaturePayload,
  ): Promise<DocumentSignatureResult> {
    return this.sdk.request("POST", `/document-signing/${token}/sign`, { body: data });
  }
}

class SurveysClient {
  constructor(private sdk: FavCRM) {}

  get(slug: string): Promise<SurveyPublicView> {
    return this.sdk.request("GET", `/surveys/${slug}`);
  }

  getByToken(token: string): Promise<SurveyPublicView> {
    return this.sdk.request("GET", `/surveys/token/${token}`);
  }

  submit(
    surveyId: string,
    data: SurveyResponseSubmission,
  ): Promise<SurveyResponseResult> {
    return this.sdk.request("POST", `/surveys/${surveyId}/responses`, { body: data });
  }

  submitByToken(
    token: string,
    data: SurveyResponseSubmission,
  ): Promise<SurveyResponseResult> {
    return this.sdk.request("POST", `/surveys/token/${token}/responses`, { body: data });
  }
}

class CmsClient {
  constructor(private sdk: FavCRM) {}

  async listPages(): Promise<CmsPageSummary[]> {
    const res = await this.sdk.request<any>("GET", "/cms/pages");
    return Array.isArray(res) ? res : res?.items ?? [];
  }

  getPage(slug: string): Promise<CmsPage> {
    return this.sdk.request("GET", `/cms/pages/${slug}`);
  }
}

export interface BlogListParams {
  type?: string;
  category?: string;
  categoryId?: string;
  search?: string;
  sort?: "createdAt" | "updatedAt" | "publishedAt" | "title" | "sortOrder";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class PackagesClient {
  constructor(private sdk: FavCRM) {}

  listMyOrders(): Promise<ServicePackageOrder[]> {
    return this.sdk.request("GET", "/service-package-orders");
  }

  getApplicable(serviceId: string): Promise<ServicePackageOrder[]> {
    return this.sdk.request("GET", "/service-package-orders/applicable", {
      params: { serviceId },
    });
  }
}

class BlogClient {
  constructor(private sdk: FavCRM) {}

  list(params?: BlogListParams): Promise<PaginatedResult<BlogPostListItem>> {
    const p: Record<string, string> = {};
    if (params?.type) p.type = params.type;
    if (params?.categoryId) p.categoryId = params.categoryId;
    else if (params?.category) p.categoryId = params.category;
    if (params?.search) p.search = params.search;
    if (params?.sort) p.sort = params.sort;
    if (params?.order) p.order = params.order;
    if (params?.page) p.page = String(params.page);
    if (params?.limit) p.limit = String(params.limit);
    return this.sdk.request("GET", "/cms/posts", { params: p });
  }

  getBySlug(slug: string): Promise<BlogPost> {
    return this.sdk.request("GET", `/cms/posts/${slug}`);
  }
}

class ContactClient {
  constructor(private sdk: FavCRM) {}

  submit(data: ContactEnquirySubmission): Promise<ContactEnquiryResult> {
    return this.sdk.request("POST", "/contact", { body: data });
  }
}

export interface WalletPassStatus {
  apple: {
    serialNumber: string;
    version: number;
    r2Key: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  google: {
    objectId: string | null;
    saveUrl: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

class WalletPassesClient {
  constructor(private sdk: FavCRM) {}

  getStatus(): Promise<WalletPassStatus> {
    return this.sdk.request("GET", "/wallet-passes/status");
  }

  generate(type: "apple" | "google"): Promise<{ queued: boolean }> {
    return this.sdk.request("POST", "/wallet-passes/generate", { body: { type } });
  }

  async downloadAppleBlob(): Promise<Blob> {
    const res = await this.sdk.fetchRaw("/wallet-passes/apple/download");
    return res.blob();
  }

  getGoogleSaveUrl(): Promise<{ saveUrl: string | null }> {
    return this.sdk.request("GET", "/wallet-passes/google/save-url");
  }
}

class GiftsClient {
  constructor(private sdk: FavCRM) {}

  listMyRedemptions(opts?: {
    status?: RedemptionStatus | Lowercase<RedemptionStatus>;
    limit?: number;
    offset?: number;
  }): Promise<ApiRewardRedemptionList> {
    const params: Record<string, string> = {};
    if (opts?.status) params.status = String(opts.status).toLowerCase();
    if (opts?.limit != null) params.limit = String(opts.limit);
    if (opts?.offset != null) params.offset = String(opts.offset);
    return this.sdk.request("GET", "/gifts/redemptions", { params });
  }

  getRedemption(id: string): Promise<ApiRewardRedemption> {
    return this.sdk.request("GET", `/gifts/redemptions/${id}`);
  }

  fulfill(id: string): Promise<ApiRewardRedemption> {
    return this.sdk.request("POST", `/gifts/redemptions/${id}/fulfill`);
  }

  listOffers(opts?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiGiftOfferList> {
    const params: Record<string, string> = {};
    if (opts?.limit != null) params.limit = String(opts.limit);
    if (opts?.offset != null) params.offset = String(opts.offset);
    return this.sdk.request("GET", "/gifts/offers", { params });
  }

  getOffer(id: string): Promise<ApiGiftOffer> {
    return this.sdk.request("GET", `/gifts/offers/${id}`);
  }

  redeemOffer(id: string): Promise<ApiRewardRedemption> {
    return this.sdk.request("POST", `/gifts/offers/${id}/redeem`);
  }

  claimByCode(code: string): Promise<ApiRewardRedemption> {
    return this.sdk.request("POST", "/gifts/claim", { body: { code } });
  }
}
