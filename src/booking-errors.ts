export const BOOKING_ERROR_CODES = {
  COOLDOWN_ACTIVE: 'BOOKING_COOLDOWN_ACTIVE',
} as const;

export interface BookingCooldownDetails {
  cooldownEndsAt?: string;
  cooldownDays?: number;
  cooldownMessage?: string | null;
}

export interface BookingErrorMessageHandlers<T> {
  cooldownWithMerchantMessage: (message: string) => T;
  cooldownWithDate: (ctx: { cooldownEndsAt: string }) => T;
  cooldownGeneric: () => T;
}

export function getBookingErrorMessage<T>(
  code: string | undefined,
  details: BookingCooldownDetails | undefined,
  handlers: BookingErrorMessageHandlers<T>,
  fallback: () => T,
): T {
  if (code === BOOKING_ERROR_CODES.COOLDOWN_ACTIVE) {
    if (details?.cooldownMessage) {
      return handlers.cooldownWithMerchantMessage(details.cooldownMessage);
    }
    if (details?.cooldownEndsAt) {
      return handlers.cooldownWithDate({ cooldownEndsAt: details.cooldownEndsAt });
    }
    return handlers.cooldownGeneric();
  }
  return fallback();
}
