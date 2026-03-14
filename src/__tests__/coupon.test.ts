import { describe, it, expect } from 'vitest';
import { buildAppliedCoupon, getCouponErrorMessage } from '../coupon.js';
import type { PromotionValidationResponse } from '../types/promotion.js';

describe('buildAppliedCoupon', () => {
  it('maps validation response to AppliedCoupon', () => {
    const result: PromotionValidationResponse = {
      isValid: true,
      promotionCode: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      discountAmount: 20,
      originalPrice: 200,
      finalPrice: 180,
      savingsPercentage: 10,
    };

    const coupon = buildAppliedCoupon('SAVE10', result);
    expect(coupon.code).toBe('SAVE10');
    expect(coupon.discountType).toBe('percentage');
    expect(coupon.discountAmount).toBe(20);
    expect(coupon.finalPrice).toBe(180);
  });
});

describe('getCouponErrorMessage', () => {
  const errorCodeMap: Record<string, () => string> = {
    PROMOTION_EXPIRED: () => 'This promotion has expired',
    PROMOTION_NOT_FOUND: () => 'Promotion not found',
  };

  it('returns mapped error message for known code', () => {
    const result: PromotionValidationResponse = {
      isValid: false, promotionCode: 'BAD',
      errorCode: 'PROMOTION_EXPIRED', errorMessage: 'Expired',
    };
    expect(getCouponErrorMessage(result, errorCodeMap, 'fallback')).toBe('This promotion has expired');
  });

  it('returns errorMessage for unknown code', () => {
    const result: PromotionValidationResponse = {
      isValid: false, promotionCode: 'BAD',
      errorCode: 'UNKNOWN_CODE', errorMessage: 'Something went wrong',
    };
    expect(getCouponErrorMessage(result, errorCodeMap, 'fallback')).toBe('Something went wrong');
  });

  it('returns fallback when no errorCode or errorMessage', () => {
    const result: PromotionValidationResponse = {
      isValid: false, promotionCode: 'BAD',
    };
    expect(getCouponErrorMessage(result, errorCodeMap, 'fallback')).toBe('fallback');
  });
});
