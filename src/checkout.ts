import type { CartItem, CreateOrderRequest } from './types/shop.js';

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
): number {
  return Math.max(cartTotal - discountAmount + shippingCost, 0);
}

export function validateCheckoutForm(
  fields: Pick<CheckoutFormFields, 'firstName' | 'lastName' | 'addressLine1' | 'city'>,
): string | null {
  if (
    !fields.firstName.trim() ||
    !fields.lastName.trim() ||
    !fields.addressLine1.trim() ||
    !fields.city.trim()
  ) {
    return 'REQUIRED_FIELDS_MISSING';
  }
  return null;
}

export function buildCreateOrderRequest(
  cart: CartItem[],
  form: CheckoutFormFields,
  shippingMethodId: number | null,
  promotionCode?: string,
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
  };
}
