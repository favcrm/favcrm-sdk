import type { AppliedCoupon, PromotionValidationResponse } from './types/promotion.js';

export function buildAppliedCoupon(
  code: string,
  result: PromotionValidationResponse,
): AppliedCoupon {
  return {
    code,
    discountType: result.discountType!,
    discountValue: result.discountValue!,
    discountAmount: result.discountAmount!,
    originalPrice: result.originalPrice!,
    finalPrice: result.finalPrice!,
    savingsPercentage: result.savingsPercentage!,
  };
}

export function getCouponErrorMessage(
  result: PromotionValidationResponse,
  errorCodeMap: Record<string, () => string>,
  fallback: string,
): string {
  const errorFn = result.errorCode ? errorCodeMap[result.errorCode] : null;
  return errorFn ? errorFn() : (result.errorMessage || fallback);
}
