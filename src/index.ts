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
  MembershipTier,
  Member,
  ApiMembershipTier,
  ApiMember,
  CardSettings,
  PaymentMethod,
  RegistrationField,
  RegistrationFormConfig,
  ReferralLookupResult,
  RegistrationSubmission,
  RegistrationResult,
} from './types/member.js';

// Types — Event
export type {
  ApiEvent,
  ApiEventDate,
  EventDate,
  EventStatus,
  Event,
  EventRegistrationStatus,
  EventRegistration,
  EventRegistrationSubmission,
  EventRegistrationResult,
} from './types/event.js';

// Types — Booking
export type {
  BookingService,
  BookingStatus,
  Booking,
  TimeSlot,
} from './types/booking.js';

// Types — Portal
export type {
  CouponClaimSubmission,
  CouponClaimResult,
  PortalConfig,
  FeatureKey,
} from './types/portal.js';

// Modules logic
export { MODULE_CODE_TO_FEATURE, ALL_FEATURE_KEYS, modulesToFeatures } from './modules.js';

// Event logic
export { mapApiEvent } from './events.js';

// Member logic
export { mapApiMember } from './members.js';

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
  validateOtp,
  validateRequired,
  validateRegistrationForm,
  validateEventRegistrationForm,
} from './validation.js';
export type { ValidationError } from './validation.js';
