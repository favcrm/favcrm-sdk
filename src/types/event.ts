/** Raw event shape from the v6 customer-portal API. */
export interface ApiEvent {
  id: string;
  slug: string;
  title: string;
  introduction?: string | null;
  content?: string | null;
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
