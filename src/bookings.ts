import type {
  BookingService,
  BookingSettings,
  Booking,
  VenueScheduleDay,
  VenueScheduleSession,
  ScheduleOffering,
  ScheduleGrid,
} from "./types/booking.js";

/**
 * A space (booking service) is "free" only when both price is zero AND the
 * merchant explicitly does not require payment. Mirrors v2/api gating:
 * `services.paymentRequired` controls Stripe; `price` controls UI.
 */
export function isFreeSpace(
  service: Pick<BookingService, "price" | "paymentRequired">,
): boolean {
  return Number(service.price) === 0 && !service.paymentRequired;
}

/**
 * Result of evaluating whether a member is allowed to cancel their booking via
 * the public magic-link flow. `reason` distinguishes between an outright block
 * (merchant disabled self-cancel) and a time-based block (past the cutoff).
 */
export type MemberCancelEligibility =
  | { ok: true }
  | { ok: false; reason: "disabled" }
  | { ok: false; reason: "past_cutoff"; cutoffHours: number };

/**
 * Decide whether a member can self-cancel a booking based on merchant policy.
 *
 * Used both server-side (the API guard on `POST /v6/public/bookings/:id/cancel`)
 * and client-side (member-portal hides the cancel button + shows a localized
 * notice). Keeping the math here ensures UI and API can never disagree.
 *
 * @param booking  Minimal booking shape — needs the local date + start time.
 * @param settings Merchant-configured booking settings (the policy bits).
 * @param now      Override for tests. Defaults to wall-clock now.
 */
export function canMemberCancelBooking(
  booking: Pick<
    {
      bookingDate: string;
      startTime: string;
    },
    "bookingDate" | "startTime"
  >,
  settings: Pick<
    BookingSettings,
    "allowMemberCancellation" | "memberCancellationCutoffHours"
  >,
  now: Date = new Date(),
): MemberCancelEligibility {
  if (!settings.allowMemberCancellation) {
    return { ok: false, reason: "disabled" };
  }

  const cutoff = settings.memberCancellationCutoffHours;
  if (cutoff != null && cutoff > 0) {
    const start = new Date(`${booking.bookingDate}T${booking.startTime}`);
    if (Number.isNaN(start.getTime())) {
      // Malformed date — fail open rather than locking out the customer; the
      // status-transition check on the server will still catch invalid states.
      return { ok: true };
    }
    const cutoffMs = start.getTime() - cutoff * 3_600_000;
    if (now.getTime() > cutoffMs) {
      return { ok: false, reason: "past_cutoff", cutoffHours: cutoff };
    }
  }

  return { ok: true };
}

/**
 * Format a booking's date and time into a human-readable string.
 * Example: "Oct 15, 2025 at 2:00 PM"
 */
export function formatBookingDateTime(
  booking: Pick<Booking, "bookingDate" | "startTime">,
  locale = "en-US"
): string {
  try {
    const d = new Date(`${booking.bookingDate}T${booking.startTime}`);
    return d.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " at " + d.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    return `${booking.bookingDate} ${booking.startTime}`;
  }
}

/**
 * Get a localized/friendly label for a booking status.
 */
export function getBookingStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    case "no_show":
      return "No Show";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

/**
 * Mirror of getEffectivePrice for products.
 * Returns the effective price of a booking service.
 */
export function getEffectiveBookingPrice(service: Pick<BookingService, "price">): number {
  return Number(service.price || 0);
}

// ============================================================================
// Whole-venue timetable (schedule grid) helpers
//
// Pure transforms over `GET /marketplace/venues/{id}/schedule` output, used by
// the member-portal week-grid timetable. No pricing here — names only; price +
// the price-locked quote resolve later in the per-service /book flow.
// ============================================================================

/** Extract "HH:MM" from a schedule session `start` ("YYYY-MM-DD HH:MM" or ISO). */
export function scheduleSlotParam(start: string): string {
  return start.match(/(\d{2}:\d{2})/)?.[1] ?? start;
}

/**
 * Distinct offerings across the whole timetable, in first-seen order — used to
 * build the filter chips ("All" + one per offering).
 */
export function extractScheduleOfferings(
  days: VenueScheduleDay[],
): ScheduleOffering[] {
  const seen = new Map<string, string>();
  for (const d of days) {
    for (const s of d.sessions) {
      if (!seen.has(s.offeringId)) seen.set(s.offeringId, s.offeringName);
    }
  }
  return [...seen.entries()].map(([offeringId, name]) => ({ offeringId, name }));
}

/**
 * Narrow each day's sessions to a single offering. `offeringId === null`
 * returns the days unchanged (the "All" filter).
 */
export function filterScheduleDays(
  days: VenueScheduleDay[],
  offeringId: string | null,
): VenueScheduleDay[] {
  if (!offeringId) return days;
  return days.map((d) => ({
    ...d,
    sessions: d.sessions.filter((s) => s.offeringId === offeringId),
  }));
}

/**
 * Lay the timetable out as a grid: a sorted list of distinct `HH:MM` row
 * labels and an index from `"date|HH:MM"` to the sessions in that cell. A cell
 * can hold multiple sessions (different offerings at the same time).
 */
export function buildScheduleGrid(days: VenueScheduleDay[]): ScheduleGrid {
  const times = new Set<string>();
  const index = new Map<string, VenueScheduleSession[]>();
  for (const d of days) {
    for (const s of d.sessions) {
      const t = scheduleSlotParam(s.start);
      times.add(t);
      const key = `${d.date}|${t}`;
      const bucket = index.get(key);
      if (bucket) bucket.push(s);
      else index.set(key, [s]);
    }
  }
  return { rows: [...times].sort(), index };
}

/** Total session count across all days — for empty-state checks. */
export function countScheduleSessions(days: VenueScheduleDay[]): number {
  return days.reduce((n, d) => n + d.sessions.length, 0);
}
