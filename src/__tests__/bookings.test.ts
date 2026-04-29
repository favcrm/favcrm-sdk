import { describe, it, expect } from "vitest";
import { isFreeSpace, canMemberCancelBooking } from "../bookings.js";
import { DEFAULT_BOOKING_SETTINGS } from "../types/booking.js";

describe("isFreeSpace", () => {
  it("is true when price is 0 and paymentRequired is false", () => {
    expect(isFreeSpace({ price: "0", paymentRequired: false })).toBe(true);
  });

  it("is false when price is 0 but paymentRequired is true", () => {
    expect(isFreeSpace({ price: "0", paymentRequired: true })).toBe(false);
  });

  it("is false when price is non-zero and paymentRequired is false", () => {
    expect(isFreeSpace({ price: "50", paymentRequired: false })).toBe(false);
  });

  it("is false when price is non-zero and paymentRequired is true", () => {
    expect(isFreeSpace({ price: "50.00", paymentRequired: true })).toBe(false);
  });

  it("treats decimal zero strings as free", () => {
    expect(isFreeSpace({ price: "0.00", paymentRequired: false })).toBe(true);
  });

  it("is false for malformed price strings", () => {
    expect(isFreeSpace({ price: "abc", paymentRequired: false })).toBe(false);
  });
});

describe("DEFAULT_BOOKING_SETTINGS", () => {
  it("shows unavailable timeslots by default for backward compatibility", () => {
    expect(DEFAULT_BOOKING_SETTINGS.hideUnavailableTimeslots).toBe(false);
  });
});

describe("canMemberCancelBooking", () => {
  const booking = { bookingDate: "2026-05-01", startTime: "14:00:00" };
  const now = new Date("2026-04-28T10:00:00");

  it("blocks when allowMemberCancellation is false", () => {
    const r = canMemberCancelBooking(
      booking,
      { allowMemberCancellation: false, memberCancellationCutoffHours: null },
      now,
    );
    expect(r).toEqual({ ok: false, reason: "disabled" });
  });

  it("allows when policy is on and no cutoff", () => {
    const r = canMemberCancelBooking(
      booking,
      { allowMemberCancellation: true, memberCancellationCutoffHours: null },
      now,
    );
    expect(r).toEqual({ ok: true });
  });

  it("treats cutoff=0 as no cutoff", () => {
    const r = canMemberCancelBooking(
      booking,
      { allowMemberCancellation: true, memberCancellationCutoffHours: 0 },
      now,
    );
    expect(r).toEqual({ ok: true });
  });

  it("allows when now is before the cutoff window", () => {
    // booking starts 2026-05-01 14:00, cutoff 24h → blocked after 2026-04-30 14:00
    const r = canMemberCancelBooking(
      booking,
      { allowMemberCancellation: true, memberCancellationCutoffHours: 24 },
      new Date("2026-04-30T13:59:59"),
    );
    expect(r).toEqual({ ok: true });
  });

  it("blocks when now is past the cutoff window", () => {
    const r = canMemberCancelBooking(
      booking,
      { allowMemberCancellation: true, memberCancellationCutoffHours: 24 },
      new Date("2026-04-30T14:00:01"),
    );
    expect(r).toEqual({ ok: false, reason: "past_cutoff", cutoffHours: 24 });
  });

  it("blocks at exactly past the cutoff edge", () => {
    // Edge: now > cutoffMs is the rule, so at cutoffMs itself it should still allow.
    const r = canMemberCancelBooking(
      booking,
      { allowMemberCancellation: true, memberCancellationCutoffHours: 24 },
      new Date("2026-04-30T14:00:00"),
    );
    expect(r).toEqual({ ok: true });
  });

  it("fails open on malformed booking date/time strings", () => {
    const r = canMemberCancelBooking(
      { bookingDate: "not-a-date", startTime: "??" },
      { allowMemberCancellation: true, memberCancellationCutoffHours: 24 },
      now,
    );
    expect(r).toEqual({ ok: true });
  });
});
