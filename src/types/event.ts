export interface EventPublicPresentation {
  overview: string[];
  highlights: Array<{ title: string; description: string }>;
  agenda: Array<{ time: string; title: string; description: string }>;
  audience: string[];
  facilitator: { name: string; role: string; bio: string };
  practical: {
    transit: string;
    accessibility: string;
    language: string;
    capacity: string;
    preparation: string;
  };
  includes: string[];
  policy: string;
  faq: Array<{ question: string; answer: string }>;
}

/** Raw event shape from the v6 customer-portal API. */
export interface ApiEvent {
  id: string;
  slug: string;
  title: string;
  introduction?: string | null;
  content?: string | null;
  /** Optional during rolling deployments; current APIs always return a normalized value. */
  publicPresentation?: EventPublicPresentation;
  price: number;
  currency: string;
  status: string;
  venue: string | null;
  venueAddress?: string | null;
  image?: string | null;
  quota?: string | null;
  showRemainingQuota?: boolean;
  maxTicketsPerOrder?: number;
  maxTicketsPerMember?: number | null;
  deliveryMode?: EventDeliveryMode;
  dates: ApiEventDate[];
}

/** Raw event date shape from the v6 API. */
export interface ApiEventDate {
  id?: string;
  startTime: string;
  endTime?: string | null;
  allDay?: boolean;
  remainingQuota?: number | null;
  isExpired?: boolean;
  isFull?: boolean;
  available?: boolean;
}

/** Normalized event date used throughout the app. */
export interface EventDate {
  id: string | null;
  startTime: string;
  endTime: string | null;
  allDay: boolean;
  remainingQuota: number | null;
  isExpired: boolean;
  isFull: boolean;
  available: boolean;
}

export type EventStatus =
  | "upcoming"
  | "ongoing"
  | "past"
  | "cancelled"
  | "published";

export type EventDeliveryMode = "in_person" | "online" | "hybrid";

/** Normalized event used throughout the app. */
export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  dates: EventDate[];
  location: string | null;
  price: number;
  currency: string;
  isFree: boolean;
  remainingQuota: number | null;
  status: EventStatus;
  maxTicketsPerOrder: number;
  maxTicketsPerMember: number | null;
  deliveryMode: EventDeliveryMode;
}

export type EventRegistrationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "paid";

export interface EventRegistration {
  id: string;
  eventId?: string;
  eventSlug: string;
  eventTitle: string;
  sessionId?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null;
  sessionAllDay?: boolean | null;
  deliveryMode?: EventDeliveryMode;
  status: EventRegistrationStatus;
  registeredAt?: string;
  createdAt?: string;
  totalAmount: number | string;
  currency: string;
  paymentRequired?: boolean;
}

export interface EventRegistrationSubmission {
  eventSlug: string;
  guestName: string;
  email: string;
  phone: string;
  quantity?: number;
  sessionId?: string;
  data?: Record<string, unknown>;
  promotionCode?: string;
  creditsUsed?: string;
}

export interface EventCommandOptions {
  /** Stable key reused only when retrying the same logical command. */
  idempotencyKey: string;
}

export interface EventCommandStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const EVENT_COMMAND_STORAGE_PREFIX = 'favcrm:event-command:';
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Create a cryptographically random command key. Persist the returned object
 * with one form operation and reuse it for every retry of that operation.
 */
export function createEventCommandOptions(): EventCommandOptions {
  return { idempotencyKey: crypto.randomUUID() };
}

/** Load one pending form operation or create and persist it. */
export function getOrCreateEventCommandOptions(
  storage: EventCommandStorage,
  operation: string,
): EventCommandOptions {
  const normalizedOperation = operation.trim();
  if (!normalizedOperation) throw new Error('Event command operation is required');
  const storageKey = `${EVENT_COMMAND_STORAGE_PREFIX}${normalizedOperation}`;
  const existing = storage.getItem(storageKey);
  if (existing && UUID_V4_PATTERN.test(existing)) {
    return { idempotencyKey: existing };
  }

  const created = createEventCommandOptions();
  storage.setItem(storageKey, created.idempotencyKey);
  return created;
}

/** Clear the persisted key only after the operation reaches a terminal state. */
export function clearEventCommandOptions(
  storage: EventCommandStorage,
  operation: string,
): void {
  const normalizedOperation = operation.trim();
  if (!normalizedOperation) return;
  storage.removeItem(`${EVENT_COMMAND_STORAGE_PREFIX}${normalizedOperation}`);
}

export interface EventRegistrationResult {
  id: string;
  eventSlug: string;
  eventTitle: string;
  status: string;
  registeredAt: string;
  totalAmount: number;
  currency: string;
  paymentRequired: boolean;
  guestRegistrationToken?: string;
}

export interface EventRegistrationAccess {
  registrationId: string;
  eventTitle: string;
  deliveryMode: EventDeliveryMode;
  canAccess: boolean;
  accessUrl: string | null;
  accessInstructions: string | null;
  availableAt: string | null;
  reason: string | null;
}

export interface EventPaymentMethod {
  id: string;
  name: string;
  type: string;
  instructions: string | null;
  position: number;
  hasGateway: boolean;
  gatewayType: string | null;
}

export interface EventPaymentSessionRequest {
  successUrl: string;
  cancelUrl: string;
  paymentMethodId?: string;
}

export interface EventPaymentSession {
  mode?: "gateway" | "manual";
  paymentUrl?: string;
  transactionId?: string;
  sessionId?: string;
  gatewayType?: string;
  registrationStatus?: string;
  paymentInstructions?: string | null;
  paymentMethodName?: string;
  guestRegistrationToken?: string;
  expiresAt?: string;
}

export interface EventPaymentStatus {
  registrationId: string;
  registrationStatus: string;
  paymentStatus: string;
  paidAt: string | null;
  transactionId: string | null;
  changed: boolean;
}
