import { describe, it, expect } from 'vitest';
import { mapApiMember } from '../members.js';
import type { ApiMember } from '../types/member.js';

function makeApiMember(overrides: Partial<ApiMember> = {}): ApiMember {
  return {
    id: 1,
    code: 'M001',
    name: 'Alice',
    lastName: 'Wong',
    phone: '+85291234567',
    email: 'alice@example.com',
    points: 100,
    stamps: 5,
    uuid: 'uuid-abc',
    agreeToReceivePromotion: true,
    expiryDate: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    membershipTier: null,
    ...overrides,
  };
}

describe('mapApiMember', () => {
  it('maps basic fields', () => {
    const result = mapApiMember(makeApiMember());
    expect(result.uuid).toBe('uuid-abc');
    expect(result.name).toBe('Alice');
    expect(result.email).toBe('alice@example.com');
    expect(result.phone).toBe('+85291234567');
    expect(result.code).toBe('M001');
    expect(result.points).toBe(100);
    expect(result.stamps).toBe(5);
  });

  it('defaults code to null when null', () => {
    const result = mapApiMember(makeApiMember({ code: null }));
    expect(result.code).toBeNull();
  });

  it('defaults points and stamps to 0 when missing', () => {
    const result = mapApiMember(makeApiMember({ points: 0, stamps: 0 }));
    expect(result.points).toBe(0);
    expect(result.stamps).toBe(0);
  });

  it('defaults name to empty string when null', () => {
    const result = mapApiMember(makeApiMember({ name: null }));
    expect(result.name).toBe('');
  });

  it('defaults phone to empty string when null', () => {
    const result = mapApiMember(makeApiMember({ phone: null }));
    expect(result.phone).toBe('');
  });

  it('passes email as null when null', () => {
    const result = mapApiMember(makeApiMember({ email: null }));
    expect(result.email).toBeNull();
  });

  it('always sets avatarUrl to null', () => {
    const result = mapApiMember(makeApiMember());
    expect(result.avatarUrl).toBeNull();
  });

  it('maps null membershipTier', () => {
    const result = mapApiMember(makeApiMember({ membershipTier: null }));
    expect(result.membershipTier).toBeNull();
  });

  it('maps membershipTier when present', () => {
    const result = mapApiMember(makeApiMember({
      membershipTier: {
        id: 10,
        name: 'Gold',
        spendingCount: 0,
        totalSpendingAmount: 0,
        description: null,
        multiplier: 1,
        discount: 0,
        priority: 3,
        isUpgradeable: true,
        paymentGateway: 'stripe',
        gatewayProductId: null,
        gatewayPriceId: null,
        validPeriodValue: 12,
        validPeriodUnit: 'months',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    }));
    expect(result.membershipTier).toEqual({
      id: '10',
      name: 'Gold',
      level: 3,
      color: '',
      benefits: [],
    });
  });

  it('defaults tier level to 0 when priority is null', () => {
    const result = mapApiMember(makeApiMember({
      membershipTier: {
        id: 5,
        name: 'Silver',
        spendingCount: 0,
        totalSpendingAmount: 0,
        description: null,
        multiplier: 1,
        discount: 0,
        priority: null,
        isUpgradeable: false,
        paymentGateway: 'stripe',
        gatewayProductId: null,
        gatewayPriceId: null,
        validPeriodValue: 12,
        validPeriodUnit: 'months',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    }));
    expect(result.membershipTier!.level).toBe(0);
  });
});
