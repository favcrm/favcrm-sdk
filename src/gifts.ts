/**
 * Gift / reward redemption — mappers and helpers.
 */

import type {
  ApiGiftOffer,
  ApiGiftOfferSummary,
  ApiRewardRedemption,
  GiftOffer,
  GiftOfferSummary,
  RedemptionStatus,
  RewardRedemption,
} from "./types/gift.js";

export function mapApiGiftOfferSummary(
  api: ApiGiftOfferSummary,
): GiftOfferSummary {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    points: api.points ?? 0,
    stamps: api.stamps ?? 0,
    image: api.image,
    faceValue: api.faceValue,
    faceValueType: api.faceValueType,
    termsAndConditions: api.termsAndConditions,
  };
}

export function mapApiRedemption(
  api: ApiRewardRedemption,
): RewardRedemption {
  return {
    id: api.id,
    status: api.status,
    couponCode: api.couponCode,
    pointsCost: api.points ?? 0,
    redemptionDate: api.redemptionDate,
    expiresAt: api.expiresAt,
    fulfilledAt: api.fulfilledAt,
    remarks: api.remarks,
    createdAt: api.createdAt,
    offer: api.giftOffer ? mapApiGiftOfferSummary(api.giftOffer) : null,
  };
}

const STATUS_LABELS: Record<RedemptionStatus, string> = {
  VALID: "Available",
  FULFILLED: "Ready to use",
  USED: "Used",
  EXPIRED: "Expired",
  VOIDED: "Voided",
};

export function getRedemptionStatusLabel(status: RedemptionStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * A redemption is "usable" when the customer can present its coupon code —
 * i.e. status is FULFILLED and not yet expired.
 */
export function isRedemptionUsable(redemption: {
  status: RedemptionStatus;
  expiresAt: string | null;
}): boolean {
  if (redemption.status !== "FULFILLED") return false;
  if (!redemption.expiresAt) return true;
  return redemption.expiresAt >= todayIso();
}

/**
 * A redemption is "actionable" when the customer can self-fulfill it now.
 */
export function isRedemptionActionable(redemption: {
  status: RedemptionStatus;
  expiresAt: string | null;
}): boolean {
  if (redemption.status !== "VALID") return false;
  if (!redemption.expiresAt) return true;
  return redemption.expiresAt >= todayIso();
}

export function formatRedemptionExpiry(
  expiresAt: string | null,
  locale = "en",
): string | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return expiresAt;
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function mapApiGiftOffer(api: ApiGiftOffer): GiftOffer {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    points: api.points ?? 0,
    stamps: api.stamps ?? 0,
    image: api.image,
    faceValue: api.faceValue,
    faceValueType: api.faceValueType,
    termsAndConditions: api.termsAndConditions,
    expiryPeriod: api.expiryPeriod,
    expiryPeriodUnit: api.expiryPeriodUnit,
    membershipTierId: api.membershipTierId,
    quota: api.quota,
    quotaPerMember: api.quotaPerMember,
    startDate: api.startDate,
    endDate: api.endDate,
    isRedeemable: api.isRedeemable,
  };
}

export interface AffordabilityResult {
  ok: boolean;
  missingPoints: number;
  missingStamps: number;
}

/**
 * Check whether a member can afford an offer right now. Returns positive
 * "missing" values when they're short, or zero when they have enough.
 */
export function canAffordOffer(
  offer: { points: number; stamps: number },
  membership: { loyaltyPoints?: number | null; stamps?: number | null },
): AffordabilityResult {
  const have = {
    points: membership.loyaltyPoints ?? 0,
    stamps: membership.stamps ?? 0,
  };
  const missingPoints = Math.max(0, offer.points - have.points);
  const missingStamps = Math.max(0, offer.stamps - have.stamps);
  return {
    ok: missingPoints === 0 && missingStamps === 0,
    missingPoints,
    missingStamps,
  };
}
