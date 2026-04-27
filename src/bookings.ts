import type { BookingService } from "./types/booking.js";

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
