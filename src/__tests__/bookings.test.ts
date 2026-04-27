import { describe, it, expect } from "vitest";
import { isFreeSpace } from "../bookings.js";

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
