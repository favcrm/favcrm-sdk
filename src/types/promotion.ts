export interface PromotionValidationRequest {
  promotionCode: string;
  channel: "booking" | "event" | "online";
  amount: number;
  serviceUuid?: string;
  eventId?: number;
}

export interface PromotionValidationResponse {
  isValid: boolean;
  promotionCode: string;
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
