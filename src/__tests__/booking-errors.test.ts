import { describe, it, expect } from "vitest";
import {
  BOOKING_ERROR_CODES,
  getBookingErrorMessage,
} from "../booking-errors.js";
import type {
  BookingCooldownDetails,
  BookingErrorMessageHandlers,
} from "../booking-errors.js";

const handlers: BookingErrorMessageHandlers<string> = {
  cooldownWithMerchantMessage: (msg) => `merchant:${msg}`,
  cooldownWithDate: ({ cooldownEndsAt }) => `date:${cooldownEndsAt}`,
  cooldownGeneric: () => "cooldown_generic",
  onHandWithDate: ({ existingBookingDate }) => `onhand:${existingBookingDate}`,
  onHandGeneric: () => "onhand_generic",
  raceConflict: () => "race_conflict",
};

const fallback = () => "fallback";

describe("BOOKING_ERROR_CODES", () => {
  it("exposes the three expected constants", () => {
    expect(BOOKING_ERROR_CODES.COOLDOWN_ACTIVE).toBe("BOOKING_COOLDOWN_ACTIVE");
    expect(BOOKING_ERROR_CODES.ON_HAND).toBe("BOOKING_ON_HAND");
    expect(BOOKING_ERROR_CODES.RACE_CONFLICT).toBe("BOOKING_RACE_CONFLICT");
  });
});

describe("getBookingErrorMessage — COOLDOWN_ACTIVE", () => {
  it("uses cooldownWithMerchantMessage when cooldownMessage is present", () => {
    const details: BookingCooldownDetails = { cooldownMessage: "Please wait 3 days" };
    const result = getBookingErrorMessage(
      BOOKING_ERROR_CODES.COOLDOWN_ACTIVE,
      details,
      handlers,
      fallback,
    );
    expect(result).toBe("merchant:Please wait 3 days");
  });

  it("prefers merchant message over cooldownEndsAt when both are present", () => {
    const details: BookingCooldownDetails = {
      cooldownMessage: "wait",
      cooldownEndsAt: "2026-07-01",
    };
    expect(
      getBookingErrorMessage(BOOKING_ERROR_CODES.COOLDOWN_ACTIVE, details, handlers, fallback),
    ).toBe("merchant:wait");
  });

  it("uses cooldownWithDate when only cooldownEndsAt is present", () => {
    const details: BookingCooldownDetails = { cooldownEndsAt: "2026-07-01" };
    const result = getBookingErrorMessage(
      BOOKING_ERROR_CODES.COOLDOWN_ACTIVE,
      details,
      handlers,
      fallback,
    );
    expect(result).toBe("date:2026-07-01");
  });

  it("uses cooldownGeneric when details has no message or date", () => {
    const result = getBookingErrorMessage(
      BOOKING_ERROR_CODES.COOLDOWN_ACTIVE,
      {},
      handlers,
      fallback,
    );
    expect(result).toBe("cooldown_generic");
  });

  it("uses cooldownGeneric when details is undefined", () => {
    const result = getBookingErrorMessage(
      BOOKING_ERROR_CODES.COOLDOWN_ACTIVE,
      undefined,
      handlers,
      fallback,
    );
    expect(result).toBe("cooldown_generic");
  });
});

describe("getBookingErrorMessage — non-cooldown codes", () => {
  it("returns fallback for an unknown error code", () => {
    expect(
      getBookingErrorMessage("BOOKING_UNKNOWN", undefined, handlers, fallback),
    ).toBe("fallback");
  });

  it("returns fallback for undefined error code", () => {
    expect(
      getBookingErrorMessage(undefined, undefined, handlers, fallback),
    ).toBe("fallback");
  });

  it("returns fallback for ON_HAND (not handled by getBookingErrorMessage itself)", () => {
    // ON_HAND / RACE_CONFLICT are not special-cased in getBookingErrorMessage —
    // callers handle them via the fallback path or their own switch.
    expect(
      getBookingErrorMessage(BOOKING_ERROR_CODES.ON_HAND, undefined, handlers, fallback),
    ).toBe("fallback");
  });
});
