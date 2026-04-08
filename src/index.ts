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
  PaymentMethodOption,
  SubscriptionPlan,
  ProductSubscription,
} from './types/shop.js';

export type {
  PromotionValidationRequest,
  PromotionValidationResponse,
  AppliedCoupon,
} from './types/promotion.js';

// Types — Member
export type {
  MembershipTier,
  PublicMembershipTier,
  Member,
  ApiMembershipTier,
  ApiMember,
  CardSettings,
  CardField,
  CardLayoutConfig,
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
  BookingDetail,
  BookingLineItem,
  BookingStatusChange,
  ServiceAddon,
  TimeSlot,
  BookingConfig,
  ResourceItem,
} from './types/booking.js';

// Types — Invoice
export type {
  InvoiceStatus,
  Invoice,
  InvoiceLineItem,
  InvoiceDetail,
} from './types/invoice.js';

// Types — Blog
export type {
  BlogCategory,
  BlogPostListItem,
  BlogPost,
} from './types/blog.js';

// Types — Contact
export type {
  ContactEnquirySubmission,
  ContactEnquiryResult,
} from './types/contact.js';

// Types — Review
export type {
  ProductReview,
  ReviewSummary,
  CreateReviewRequest,
  ReviewContext,
} from './types/review.js';

// Types — Service Package
export type {
  ServicePackageOrder,
} from './types/service-package.js';

// Types — CMS
export type {
  CmsBlock,
  CmsPage,
} from './types/cms.js';

// Types — Portal
export type {
  CouponClaimSubmission,
  CouponClaimResult,
  PortalConfig,
  FeatureKey,
  AnalyticsConfig,
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
  findVariation,
  getVariationLabel,
  normalizeSearchQuery,
  matchesSearchQuery,
  filterProducts,
  filterProductsByCategory,
  highlightSearchMatch,
  isSubscriptionProduct,
  formatSubscriptionPrice,
  getMonthlyEquivalent,
  getRelatedProducts,
} from './shop.js';
export type { SearchMatchSegment } from './shop.js';

// Checkout logic
export {
  calculateFinalTotal,
  validateCheckoutForm,
  buildCreateOrderRequest,
} from './checkout.js';
export type { CheckoutFormFields, PaymentOptions } from './checkout.js';

// Coupon logic
export { buildAppliedCoupon, getCouponErrorMessage } from './coupon.js';

// API Client
export { FavCRM, FavCRMError } from './client.js';
export type {
  FavCRMConfig,
  ProductListParams,
  TimeSlotsParams,
  TimeSlotsResponse,
  StaffMember,
  PaymentGateway,
  PaymentIntentRequest,
  PaymentIntentResponse,
  BlogListParams,
  PaginatedResult,
} from './client.js';

// Validation
export {
  validateEmail,
  validatePhone,
  validateOtp,
  validateRequired,
  validateRegistrationForm,
  validateEventRegistrationForm,
  validateContactForm,
} from './validation.js';
export type { ValidationError } from './validation.js';
