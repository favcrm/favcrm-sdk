import type { CartItem, CreateOrderRequest, ShippingMethod } from './types/shop.js';

export interface CheckoutFormFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
}

export function calculateFinalTotal(
  cartTotal: number,
  discountAmount: number,
  shippingCost: number,
  creditsApplied: number = 0,
): number {
  return Math.max(cartTotal - discountAmount + shippingCost - creditsApplied, 0);
}

export function validateCheckoutForm(
  fields: Pick<CheckoutFormFields, 'firstName' | 'lastName' | 'email' | 'addressLine1' | 'city'>,
): string | null {
  if (
    !fields.firstName.trim() ||
    !fields.lastName.trim() ||
    !fields.email.trim() ||
    !fields.addressLine1.trim() ||
    !fields.city.trim()
  ) {
    return 'REQUIRED_FIELDS_MISSING';
  }
  return null;
}

export interface ShippingEligibility {
  method: ShippingMethod;
  meetsThreshold: boolean;
  locked: boolean;
  effectiveCost: number;
  amountToUnlock: number;
}

export function computeShippingEligibility(
  methods: ShippingMethod[],
  cartTotal: number,
): ShippingEligibility[] {
  return methods.map((method) => {
    const threshold = method.freeShippingThreshold;
    const hasThreshold = threshold != null && threshold > 0;
    const meetsThreshold = hasThreshold && cartTotal >= threshold;
    const isFreeOnly = method.cost === 0 && hasThreshold;
    const locked = isFreeOnly && !meetsThreshold;
    const effectiveCost = meetsThreshold ? 0 : method.cost;
    const amountToUnlock = hasThreshold && !meetsThreshold ? threshold - cartTotal : 0;
    return { method, meetsThreshold, locked, effectiveCost, amountToUnlock };
  });
}

export function pickDefaultShippingId(
  eligibility: ShippingEligibility[],
): number | null {
  const unlocked = eligibility.find((e) => !e.locked);
  return unlocked ? unlocked.method.id : null;
}

export interface PaymentOptions {
  paymentMethodId?: string;
  creditsUsed?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export function buildCreateOrderRequest(
  cart: CartItem[],
  form: CheckoutFormFields,
  shippingMethodId: number | null,
  promotionCode?: string,
  payment?: PaymentOptions,
): CreateOrderRequest {
  return {
    lineItems: cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      ...(item.variationId != null && { variationId: item.variationId }),
    })),
    customerInfo: {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
    },
    shippingAddress: {
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim() || undefined,
      city: form.city.trim(),
      country: form.country,
    },
    shippingMethodId: shippingMethodId ?? undefined,
    promotionCode,
    ...(payment?.paymentMethodId != null && { paymentMethodId: payment.paymentMethodId }),
    ...(payment?.creditsUsed != null && { creditsUsed: payment.creditsUsed }),
    ...(payment?.successUrl != null && { successUrl: payment.successUrl }),
    ...(payment?.cancelUrl != null && { cancelUrl: payment.cancelUrl }),
  };
}
