// Types — Shop
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

// Types — Member
export type {
  RegistrationSubmission,
  RegistrationResult,
} from './types/member.js';

// Types — Event
export type {
  EventListItem,
  EventDetail,
  EventSession,
  EventRegistrationSubmission,
  EventRegistrationResult,
} from './types/event.js';

// Types — Portal
export type {
  CouponClaimSubmission,
  CouponClaimResult,
  PortalConfig,
} from './types/portal.js';

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

// API Client
export { FavCRMClient, FavCRMError } from './client.js';
export type { FavCRMConfig, ProductListParams } from './client.js';

// Validation
export {
  validateEmail,
  validatePhone,
  validateRequired,
  validateRegistrationForm,
  validateEventRegistrationForm,
} from './validation.js';
export type { ValidationError } from './validation.js';
