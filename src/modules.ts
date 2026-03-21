import type { FeatureKey } from './types/portal.js';

export const MODULE_CODE_TO_FEATURE: Record<string, FeatureKey> = {
  bookings: "spaces",
  events: "events",
  payment_gateway: "payments",
  card_builder: "memberCard",
  orders_shop: "shop",
};

export const ALL_FEATURE_KEYS: FeatureKey[] = [
  "spaces", "events", "payments", "memberCard", "shop",
];

export function modulesToFeatures(moduleCodes: string[]): Set<FeatureKey> {
  const result = new Set<FeatureKey>();
  for (const code of moduleCodes) {
    const feature = MODULE_CODE_TO_FEATURE[code];
    if (feature) result.add(feature);
  }
  return result;
}
