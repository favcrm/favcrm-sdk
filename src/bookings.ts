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

function normalizeBookingTime(time: string): string {
  const [hour = "0", minute = "0", second = "0"] = time.split(":");
  return [
    hour.padStart(2, "0"),
    minute.padStart(2, "0"),
    second.padStart(2, "0"),
  ].join(":");
}

function zonedDateTimeToDate(
  date: string,
  time: string,
  timeZone: string,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(
    `${date}T${normalizeBookingTime(time)}`,
  );
  if (!match) return null;

  const [, y, mo, d, h, mi, s] = match;
  const targetLocalMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
  );
  let utcMs = targetLocalMs;

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    for (let i = 0; i < 3; i += 1) {
      const parts = formatter.formatToParts(new Date(utcMs));
      const get = (type: string) =>
        Number(parts.find((part) => part.type === type)?.value);
      const renderedLocalMs = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour"),
        get("minute"),
        get("second"),
      );
      const delta = renderedLocalMs - targetLocalMs;
      if (delta === 0) break;
      utcMs -= delta;
    }
  } catch {
    return null;
  }

  const result = new Date(utcMs);
  return Number.isNaN(result.getTime()) ? null : result;
}

function bookingStartInstant(
  booking: Pick<{ bookingDate: string; startTime: string }, "bookingDate" | "startTime">,
  timeZone?: string | null,
): Date | null {
  if (timeZone) return zonedDateTimeToDate(booking.bookingDate, booking.startTime, timeZone);
  const start = new Date(`${booking.bookingDate}T${booking.startTime}`);
  return Number.isNaN(start.getTime()) ? null : start;
}

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
 * @param timeZone IANA company timezone for booking wall-clock interpretation.
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
  timeZone?: string | null,
): MemberCancelEligibility {
  if (!settings.allowMemberCancellation) {
    return { ok: false, reason: "disabled" };
  }

  const cutoff = settings.memberCancellationCutoffHours;
  if (cutoff != null && cutoff > 0) {
    const start = bookingStartInstant(booking, timeZone);
    if (!start) {
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
