/**
 * Gift / reward redemption — customer-portal types.
 *
 * Backend statuses on `rewardRedemptions.status`:
 *   VALID      — issued, awaiting fulfillment
 *   FULFILLED  — coupon code claimed by member, presentable at POS
 *   USED       — consumed at POS / online
 *   EXPIRED    — past expiry date
 *   VOIDED     — revoked by merchant
 */

export type RedemptionStatus =
  | "VALID"
  | "FULFILLED"
  | "USED"
  | "EXPIRED"
  | "VOIDED";

export type FaceValueType = "PERCENTAGE" | "AMOUNT";

export interface ApiGiftOfferSummary {
  id: string;
  name: string;
  description: string | null;
  points: number | null;
  stamps: number | null;
  image: string | null;
  faceValue: number | null;
  faceValueType: FaceValueType | null;
  termsAndConditions: string | null;
}

export interface ApiRewardRedemption {
  id: string;
  status: RedemptionStatus;
  couponCode: string | null;
  points: number | null;
  redemptionDate: string | null;
  expiresAt: string | null;
  fulfilledAt: string | null;
  fulfillmentMethod: string | null;
  remarks: string | null;
  createdAt: string;
  giftOffer: ApiGiftOfferSummary | null;
}

export interface ApiRewardRedemptionList {
  items: ApiRewardRedemption[];
  total: number;
  limit: number;
  offset: number;
}

export interface RewardRedemption {
  id: string;
  status: RedemptionStatus;
  couponCode: string | null;
  pointsCost: number;
  redemptionDate: string | null;
  expiresAt: string | null;
  fulfilledAt: string | null;
  remarks: string | null;
  createdAt: string;
  offer: GiftOfferSummary | null;
}

export interface GiftOfferSummary {
  id: string;
  name: string;
  description: string | null;
  points: number;
  stamps: number;
  image: string | null;
  faceValue: number | null;
  faceValueType: FaceValueType | null;
  termsAndConditions: string | null;
}

/** Detailed offer shape returned by the public catalog endpoints. */
export interface ApiGiftOffer {
  id: string;
  name: string;
  description: string | null;
  points: number | null;
  stamps: number | null;
  faceValue: number | null;
  faceValueType: FaceValueType | null;
  image: string | null;
  termsAndConditions: string | null;
  expiryPeriod: string | null;
  expiryPeriodUnit: string | null;
  membershipTierId: string | null;
  quota: number;
  quotaPerMember: number;
  startDate: string | null;
  endDate: string | null;
  isRedeemable: boolean;
  status: string;
}

export interface ApiGiftOfferList {
  items: ApiGiftOffer[];
  total: number;
  limit: number;
  offset: number;
}

export interface GiftOffer extends GiftOfferSummary {
  expiryPeriod: string | null;
  expiryPeriodUnit: string | null;
  membershipTierId: string | null;
  quota: number;
  quotaPerMember: number;
  startDate: string | null;
  endDate: string | null;
  isRedeemable: boolean;
}
