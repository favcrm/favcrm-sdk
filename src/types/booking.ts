export interface ServiceAddon {
  id: string;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
  productImageUrl: string | null;
}

export interface RegistrationFormField {
  key: string;
  label: string;
  type: "text" | "phone" | "email" | "select" | "date" | "checkbox";
  required: boolean;
  enabled: boolean;
  order: number;
  checkboxLabel?: string;
}

export interface RegistrationFormConfig {
  fields: RegistrationFormField[];
  defaultCountryCode: string;
  countryCode?: string;
  countryPhonePrefix?: string;
}

export interface BookingService {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  type: string;
  durationMinutes: number;
  capacity: number;
  price: string;
  displayPrice: string | null;
  currency: string;
  coverImage: string | null;
  sortOrder: number;
  requiresStaff: boolean;
  requiresResource: boolean;
  paymentRequired: boolean;
  requiresConfirmation: boolean;
  requireLogin: boolean;
  advanceBookingDays: number | null;
  maxBookableTimeslots: number | null;
  categoryId: string | null;
  categoryName: string | null;
  addons?: ServiceAddon[];
  registrationForm?: RegistrationFormConfig;
}

export type BookingStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  status: BookingStatus;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: string;
  currency: string;
  createdAt: string;
}

export interface BookingLineItem {
  id: string;
  type: string;
  name: string;
  description: string | null;
  price: string;
  memberTierPrice: string | null;
  durationMinutes: number;
  occurrenceStart: string | null;
  occurrenceEnd: string | null;
}

export interface BookingStatusChange {
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
}

export interface BookingDetail extends Booking {
  subtotal: string;
  addonsTotal: string;
  discountAmount: string | null;
  promotionCode: string | null;
  totalDurationMinutes: number;
  notes: string | null;
  cancellationReason: string | null;
  lineItems: BookingLineItem[];
  statusHistory: BookingStatusChange[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingCapacity: number;
  scheduleId?: string;
  resourceId?: string | null;
  quoteId?: string;
  basePrice?: string;
  tierPrice?: string;
  tierName?: string | null;
  priceType?: string;
}

export interface ResourceItem {
  resourceId: string;
  resourceName: string;
  resourceType: string;
}

/**
 * One session in the whole-venue timetable
 * (`GET /marketplace/venues/{id}/schedule`). Names only — no pricing or
 * remaining capacity; tier price + the price-locked quote resolve later in the
 * per-service slots/quote path when the customer actually books.
 */
export interface VenueScheduleSession {
  offeringId: string;
  offeringName: string;
  offeringType: "service" | "event";
  scheduleId: string | null;
  sessionId: string | null;
  /** Service: "YYYY-MM-DD HH:MM". Event: the session's stored datetime. */
  start: string;
  end: string | null;
  available: boolean;
  durationMinutes: number | null;
}

/** One day of the whole-venue timetable, with every offering's sessions. */
export interface VenueScheduleDay {
  date: string; // YYYY-MM-DD
  weekday: string; // Sun..Sat
  bookable: boolean;
  sessions: VenueScheduleSession[];
}

/** An offering surfaced in the timetable, for filter chips. */
export interface ScheduleOffering {
  offeringId: string;
  name: string;
}

/**
 * Timetable laid out as a grid: a sorted list of `HH:MM` row labels and an
 * index from `"date|HH:MM"` to the sessions in that cell.
 */
export interface ScheduleGrid {
  rows: string[];
  index: Map<string, VenueScheduleSession[]>;
}

export interface BookingConfig {
  advanceBookingDays: number | null;
  maxBookableTimeslots: number | null;
  isAllowed: boolean;
  dailyBookingCount: number | null;
  weeklyBookingCount: number | null;
  weeklyHoursLimit: number | null;
  currentDailyUsage: number;
  currentWeeklyUsage: number;
}

/**
 * Brand-wide booking settings configured by the merchant in the portal.
 * Controls how the customer-facing booking page behaves.
 */
export interface BookingSettings {
  /** Whether to show the coupon input field on the booking page. */
  showCoupon: boolean;
  /** Whether to surface the Access Pass redemption flow on the booking page. */
  showAccessPass: boolean;
  /** Slot picker rendering style: flat list of dates or month calendar. */
  calendarStyle: "list" | "calendar";
  /** Whether unavailable/full timeslots should be hidden from customers. */
  hideUnavailableTimeslots: boolean;
  /** Whether members can cancel their own booking via the magic-link page. */
  allowMemberCancellation: boolean;
  /**
   * Hours before bookingDate/startTime after which member self-cancel is
   * blocked. `null` = no cutoff (allow until start). 0 also disables cutoff.
   */
  memberCancellationCutoffHours: number | null;
  /**
   * Minutes before a slot start after which customer booking is blocked.
   * `null` or `0` = no cutoff. Set > 0 to require advance notice.
   */
  minimumAdvanceBookingMinutes: number | null;
}

/**
 * Defaults applied when a tenant has no booking settings configured. Single
 * source of truth — re-used by the API merge and member-portal fallback so
 * server and clients never drift.
 */
export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  showCoupon: true,
  showAccessPass: true,
  calendarStyle: "list",
  hideUnavailableTimeslots: false,
  allowMemberCancellation: true,
  memberCancellationCutoffHours: null,
  minimumAdvanceBookingMinutes: null,
};

export interface CreateBookingRequest {
  serviceId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  scheduleId?: string;
  staffId?: string;
  resourceId?: string;
  addonIds?: string[];
  quoteId?: string;
  notes?: string;
  slots?: any[]; // Allow complex slot shapes depending on multi-slot booking
}

export interface BookingListParams {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  limit?: string;
  upcoming?: "true" | "false";
}

export interface UpdateBookingInput {
  staffId?: string | null;
  resourceId?: string | null;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
}
