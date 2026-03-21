import { describe, it, expect } from 'vitest';
import { modulesToFeatures, MODULE_CODE_TO_FEATURE, ALL_FEATURE_KEYS } from '../modules.js';

describe('modulesToFeatures', () => {
  it('maps known module codes to feature keys', () => {
    const result = modulesToFeatures(['bookings', 'events']);
    expect(result).toEqual(new Set(['spaces', 'events']));
  });

  it('maps all known codes', () => {
    const allCodes = Object.keys(MODULE_CODE_TO_FEATURE);
    const result = modulesToFeatures(allCodes);
    expect(result).toEqual(new Set(ALL_FEATURE_KEYS));
  });

  it('ignores unknown module codes', () => {
    const result = modulesToFeatures(['bookings', 'unknown_module']);
    expect(result).toEqual(new Set(['spaces']));
  });

  it('returns empty set for empty input', () => {
    const result = modulesToFeatures([]);
    expect(result.size).toBe(0);
  });

  it('returns empty set for all unknown codes', () => {
    const result = modulesToFeatures(['foo', 'bar']);
    expect(result.size).toBe(0);
  });

  it('maps payment_gateway to payments', () => {
    const result = modulesToFeatures(['payment_gateway']);
    expect(result.has('payments')).toBe(true);
  });

  it('maps card_builder to memberCard', () => {
    const result = modulesToFeatures(['card_builder']);
    expect(result.has('memberCard')).toBe(true);
  });

  it('maps orders_shop to shop', () => {
    const result = modulesToFeatures(['orders_shop']);
    expect(result.has('shop')).toBe(true);
  });
});

describe('ALL_FEATURE_KEYS', () => {
  it('contains all values from MODULE_CODE_TO_FEATURE', () => {
    const mapped = new Set(Object.values(MODULE_CODE_TO_FEATURE));
    for (const key of mapped) {
      expect(ALL_FEATURE_KEYS).toContain(key);
    }
  });
});
