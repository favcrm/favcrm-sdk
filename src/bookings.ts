import type { BookingService, BookingSettings, Booking } from "./types/booking.js";

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
