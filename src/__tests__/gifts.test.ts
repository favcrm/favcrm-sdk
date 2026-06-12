import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mapApiGiftOfferSummary,
  mapApiGiftOffer,
  mapApiRedemption,
  getRedemptionStatusLabel,
  isRedemptionUsable,
  isRedemptionActionable,
  formatRedemptionExpiry,
  canAffordOffer,
} from "../gifts.js";
import type {
  ApiGiftOfferSummary,
  ApiGiftOffer,
  ApiRewardRedemption,
  RedemptionStatus,
} from "../types/gift.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const apiOfferSummary: ApiGiftOfferSummary = {
  id: "offer-1",
  name: "Free Coffee",
  description: "One free coffee",
  points: 100,
  stamps: 0,
  image: "https://cdn.example.com/coffee.jpg",
  faceValue: 50,
  faceValueType: "AMOUNT",
  termsAndConditions: "One per member",
};

const apiOffer: ApiGiftOffer = {
  id: "offer-1",
  name: "Free Coffee",
  description: "One free coffee",
  points: 100,
  stamps: 0,
  image: "https://cdn.example.com/coffee.jpg",
  faceValue: 50,
  faceValueType: "AMOUNT",
  termsAndConditions: "One per member",
  expiryPeriod: "30",
  expiryPeriodUnit: "days",
  membershipTierId: null,
  quota: 200,
  quotaPerMember: 1,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  isRedeemable: true,
  status: "active",
};

const makeRedemption = (
  over: Partial<ApiRewardRedemption> = {},
): ApiRewardRedemption => ({
  id: "red-1",
  status: "VALID" as RedemptionStatus,
  couponCode: "ABC123",
  points: 100,
  redemptionDate: "2026-06-01",
  expiresAt: null,
  fulfilledAt: null,
  fulfillmentMethod: null,
  remarks: null,
  createdAt: "2026-06-01T00:00:00Z",
  giftOffer: apiOfferSummary,
  ...over,
});

// ---------------------------------------------------------------------------
// mapApiGiftOfferSummary
// ---------------------------------------------------------------------------

describe("mapApiGiftOfferSummary", () => {
  it("maps all fields correctly", () => {
    const result = mapApiGiftOfferSummary(apiOfferSummary);
    expect(result.id).toBe("offer-1");
    expect(result.name).toBe("Free Coffee");
    expect(result.points).toBe(100);
    expect(result.stamps).toBe(0);
    expect(result.faceValue).toBe(50);
    expect(result.faceValueType).toBe("AMOUNT");
  });

  it("defaults points to 0 when undefined", () => {
    const result = mapApiGiftOfferSummary({ ...apiOfferSummary, points: undefined });
    expect(result.points).toBe(0);
  });

  it("defaults stamps to 0 when undefined", () => {
    const result = mapApiGiftOfferSummary({ ...apiOfferSummary, stamps: undefined });
    expect(result.stamps).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mapApiGiftOffer
// ---------------------------------------------------------------------------

describe("mapApiGiftOffer", () => {
  it("maps all fields including extended ones", () => {
    const result = mapApiGiftOffer(apiOffer);
    expect(result.expiryPeriod).toBe("30");
    expect(result.expiryPeriodUnit).toBe("days");
    expect(result.membershipTierId).toBeNull();
    expect(result.quota).toBe(200);
    expect(result.quotaPerMember).toBe(1);
    expect(result.startDate).toBe("2026-01-01");
    expect(result.endDate).toBe("2026-12-31");
    expect(result.isRedeemable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mapApiRedemption
// ---------------------------------------------------------------------------

describe("mapApiRedemption", () => {
  it("maps fields and nested offer", () => {
    const result = mapApiRedemption(makeRedemption());
    expect(result.id).toBe("red-1");
    expect(result.status).toBe("VALID");
    expect(result.couponCode).toBe("ABC123");
    expect(result.pointsCost).toBe(100);
    expect(result.offer).not.toBeNull();
    expect(result.offer?.id).toBe("offer-1");
  });

  it("maps null giftOffer to null offer", () => {
    const result = mapApiRedemption(makeRedemption({ giftOffer: null }));
    expect(result.offer).toBeNull();
  });

  it("defaults pointsCost to 0 when points is undefined", () => {
    const result = mapApiRedemption(makeRedemption({ points: undefined }));
    expect(result.pointsCost).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getRedemptionStatusLabel
// ---------------------------------------------------------------------------

describe("getRedemptionStatusLabel", () => {
  const cases: [RedemptionStatus, string][] = [
    ["VALID", "Available"],
    ["FULFILLED", "Ready to use"],
    ["USED", "Used"],
    ["EXPIRED", "Expired"],
    ["VOIDED", "Voided"],
  ];

  it.each(cases)("maps %s → %s", (status, label) => {
    expect(getRedemptionStatusLabel(status)).toBe(label);
  });
});

// ---------------------------------------------------------------------------
// isRedemptionUsable
// ---------------------------------------------------------------------------

describe("isRedemptionUsable", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns false for non-FULFILLED status", () => {
    expect(isRedemptionUsable({ status: "VALID", expiresAt: null })).toBe(false);
    expect(isRedemptionUsable({ status: "USED", expiresAt: null })).toBe(false);
    expect(isRedemptionUsable({ status: "EXPIRED", expiresAt: null })).toBe(false);
  });

  it("returns true for FULFILLED with no expiry", () => {
    expect(isRedemptionUsable({ status: "FULFILLED", expiresAt: null })).toBe(true);
  });

  it("returns true for FULFILLED before expiry date", () => {
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-05-01T00:00:00.000Z");
    expect(isRedemptionUsable({ status: "FULFILLED", expiresAt: "2026-06-01" })).toBe(true);
  });

  it("returns false for FULFILLED after expiry date", () => {
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-07-01T00:00:00.000Z");
    expect(isRedemptionUsable({ status: "FULFILLED", expiresAt: "2026-06-01" })).toBe(false);
  });

  it("returns true on the exact expiry date", () => {
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-06-01T00:00:00.000Z");
    expect(isRedemptionUsable({ status: "FULFILLED", expiresAt: "2026-06-01" })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isRedemptionActionable
// ---------------------------------------------------------------------------

describe("isRedemptionActionable", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns false for non-VALID status", () => {
    expect(isRedemptionActionable({ status: "FULFILLED", expiresAt: null })).toBe(false);
    expect(isRedemptionActionable({ status: "USED", expiresAt: null })).toBe(false);
  });

  it("returns true for VALID with no expiry", () => {
    expect(isRedemptionActionable({ status: "VALID", expiresAt: null })).toBe(true);
  });

  it("returns true for VALID before expiry", () => {
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-05-01T00:00:00.000Z");
    expect(isRedemptionActionable({ status: "VALID", expiresAt: "2026-06-01" })).toBe(true);
  });

  it("returns false for VALID after expiry", () => {
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-07-01T00:00:00.000Z");
    expect(isRedemptionActionable({ status: "VALID", expiresAt: "2026-06-01" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatRedemptionExpiry
// ---------------------------------------------------------------------------

describe("formatRedemptionExpiry", () => {
  it("returns null for null input", () => {
    expect(formatRedemptionExpiry(null)).toBeNull();
  });

  it("returns the original string for an invalid date", () => {
    expect(formatRedemptionExpiry("not-a-date")).toBe("not-a-date");
  });

  it("returns a formatted date string for a valid ISO date", () => {
    const result = formatRedemptionExpiry("2026-12-31", "en");
    // Should contain the year and month/day info; exact format is locale-dependent
    expect(result).toContain("2026");
  });
});

// ---------------------------------------------------------------------------
// canAffordOffer
// ---------------------------------------------------------------------------

describe("canAffordOffer", () => {
  it("returns ok:true when member has enough of both", () => {
    expect(
      canAffordOffer({ points: 100, stamps: 5 }, { loyaltyPoints: 200, stamps: 10 }),
    ).toEqual({ ok: true, missingPoints: 0, missingStamps: 0 });
  });

  it("returns ok:false with positive missingPoints when short on points", () => {
    expect(
      canAffordOffer({ points: 200, stamps: 0 }, { loyaltyPoints: 100, stamps: 0 }),
    ).toEqual({ ok: false, missingPoints: 100, missingStamps: 0 });
  });

  it("returns ok:false with positive missingStamps when short on stamps", () => {
    expect(
      canAffordOffer({ points: 0, stamps: 10 }, { loyaltyPoints: 0, stamps: 3 }),
    ).toEqual({ ok: false, missingPoints: 0, missingStamps: 7 });
  });

  it("returns ok:false when short on both", () => {
    const result = canAffordOffer(
      { points: 100, stamps: 5 },
      { loyaltyPoints: 50, stamps: 2 },
    );
    expect(result.ok).toBe(false);
    expect(result.missingPoints).toBe(50);
    expect(result.missingStamps).toBe(3);
  });

  it("treats null loyaltyPoints as 0", () => {
    expect(
      canAffordOffer({ points: 10, stamps: 0 }, { loyaltyPoints: null, stamps: 0 }),
    ).toEqual({ ok: false, missingPoints: 10, missingStamps: 0 });
  });

  it("treats undefined loyaltyPoints as 0", () => {
    expect(
      canAffordOffer({ points: 10, stamps: 0 }, {}),
    ).toEqual({ ok: false, missingPoints: 10, missingStamps: 0 });
  });

  it("returns ok:true for a free (zero-cost) offer", () => {
    expect(
      canAffordOffer({ points: 0, stamps: 0 }, { loyaltyPoints: 0, stamps: 0 }),
    ).toEqual({ ok: true, missingPoints: 0, missingStamps: 0 });
  });
});
