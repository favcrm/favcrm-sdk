// Types
export type {
  ProductImage,
  ProductOptionValue,
  ProductOption,
  ProductVariation,
  CategoryRef,
  Product,
  ProductListItem,
  CartItem,
  ShopCategory,
  ShippingMethod,
  CreateOrderRequest,
  ShopOrderItem,
  ShopOrder,
} from './types/shop.js';

export type {
  PromotionValidationRequest,
  PromotionValidationResponse,
  AppliedCoupon,
} from './types/promotion.js';

// Shop logic
export {
  getEffectivePrice,
  hasDiscount,
  isInStock,
  getProductLink,
  getCategoryLabel,
  getPrimaryImage,
  toCartProduct,
} from './shop.js';

// Checkout logic
export {
  calculateFinalTotal,
  validateCheckoutForm,
  buildCreateOrderRequest,
} from './checkout.js';
export type { CheckoutFormFields } from './checkout.js';

// Coupon logic
export { buildAppliedCoupon, getCouponErrorMessage } from './coupon.js';
