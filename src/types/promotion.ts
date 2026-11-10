export interface PromotionValidationRequest {
  promotionCode: string;
  channel: "booking" | "event" | "online";
  amount: number;
  serviceUuid?: string;
  eventId?: string;
  /** Cart item count; required for minimum-quantity promos on the online channel. */
  quantity?: number;
}

export interface PromotionValidationResponse {
  isValid: boolean;
  promotionCode: string;
  /**
   * True only when the request carried an authenticated customer account.
   * Guest responses (`false`) are code-level pre-checks: the per-customer usage
   * limit is not evaluated here, and guest flows do not reliably apply it later.
   */
  accountEligibilityVerified: boolean;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  originalPrice?: number;
  finalPrice?: number;
  savingsPercentage?: number;
  errorMessage?: string;
  errorCode?: string;
}

export interface AppliedCoupon {
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  originalPrice: number;
  finalPrice: number;
  savingsPercentage: number;
}
