import { describe, expect, it } from "vitest";
import {
  deriveMembershipEffectiveStatus,
  isMembershipActive,
  isMembershipExpiringSoon,
  daysUntilMembershipExpiry,
} from "../membership.js";

describe("membership helpers", () => {
  it("derives active status", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      deriveMembershipEffectiveStatus({ status: "active", expiresAt: future }),
    ).toBe("active");
    expect(isMembershipActive({ status: "active", expiresAt: future })).toBe(true);
  });

  it("derives expired from date", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      deriveMembershipEffectiveStatus({ status: "active", expiresAt: past }),
    ).toBe("expired");
    expect(isMembershipActive({ status: "active", expiresAt: past })).toBe(false);
  });

  it("detects expiring soon", () => {
    const soon = new Date(Date.now() + 5 * 86400000).toISOString();
    expect(isMembershipExpiringSoon(soon, 30)).toBe(true);
  });

  it("computes days until expiry", () => {
    const inTenDays = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(daysUntilMembershipExpiry(inTenDays)).toBeGreaterThanOrEqual(9);
  });
});
