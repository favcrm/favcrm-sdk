import type { AppliedCoupon, PromotionValidationResponse } from './types/promotion.js';

/**
 * Build an `AppliedCoupon` from a validated promotion response.
 *
 * All numeric fields are present when `isValid === true`; callers should only
 * call this function after confirming validity. If any field is missing the
 * function falls back to zero / empty-string so the return type is satisfied
 * without non-null assertions.
 */
export function buildAppliedCoupon(
  code: string,
  result: PromotionValidationResponse,
): AppliedCoupon {
  if (!result.isValid) {
    // Constructing an AppliedCoupon for an invalid promotion is almost always
    // a caller mistake. Return a zeroed-out record rather than throwing so that
    // existing UI code can still display something meaningful.
    return {
      code,
      discountType: result.discountType ?? '',
      discountValue: result.discountValue ?? 0,
      discountAmount: result.discountAmount ?? 0,
      originalPrice: result.originalPrice ?? 0,
      finalPrice: result.finalPrice ?? 0,
      savingsPercentage: result.savingsPercentage ?? 0,
    };
  }
  return {
    code,
    discountType: result.discountType ?? '',
    discountValue: result.discountValue ?? 0,
    discountAmount: result.discountAmount ?? 0,
    originalPrice: result.originalPrice ?? 0,
    finalPrice: result.finalPrice ?? 0,
    savingsPercentage: result.savingsPercentage ?? 0,
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
