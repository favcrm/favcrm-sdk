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
  ShopBrand,
  ShopCollection,
  ShopGroupRef,
  ShippingMethod,
  CreateOrderRequest,
  ShopOffer,
  ShopOfferContext,
  ShopOfferListParams,
  ShopOfferProduct,
  ShopOrderItem,
  ShopOrder,
  ShopOrderPaymentStatus,
  PaymentMethodOption,
  SubscriptionPlan,
  ProductSubscription,
} from "./types/shop.js";

export type {
  PromotionValidationRequest,
  PromotionValidationResponse,
  AppliedCoupon,
} from "./types/promotion.js";

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
} from "./types/member.js";

// Types — Event
export type {
  ApiEvent,
  ApiEventDate,
  EventDate,
  EventStatus,
  EventDeliveryMode,
  Event,
  EventRegistrationStatus,
  EventRegistration,
  EventRegistrationSubmission,
  EventRegistrationResult,
  EventRegistrationAccess,
  EventPaymentMethod,
  EventPaymentSessionRequest,
  EventPaymentSession,
} from "./types/event.js";

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
  BookingSettings,
  ResourceItem,
  VenueScheduleSession,
  VenueScheduleDay,
  ScheduleOffering,
  ScheduleGrid,
} from "./types/booking.js";
export { DEFAULT_BOOKING_SETTINGS } from "./types/booking.js";

// Types — Invoice
export type {
  InvoiceStatus,
  Invoice,
  InvoiceLineItem,
  InvoiceDetail,
} from "./types/invoice.js";

// Types — Documents
export type {
  DocumentSigningData,
  DocumentSignaturePayload,
  DocumentSignatureResult,
} from "./types/document.js";

// Types — Survey
export type {
  Survey,
  SurveyInvitation,
  SurveyPublicView,
  SurveyQuestionBlock,
  SurveyQuestionBlockType,
  SurveyQuestionOption,
  SurveyQuestionValidation,
  SurveyQuestionBranch,
  SurveySettings,
  SurveyStatus,
  SurveyVisibilityMode,
  SurveyResponseStatus,
  SurveyResponseSubmission,
  SurveyResponseResult,
} from "./types/survey.js";

// Types — Blog
export type { BlogCategory, BlogPostListItem, BlogPost } from "./types/blog.js";

// Types — Tag
export type { Tag } from "./types/tag.js";

// Types — Custom Post Types (schema + value shapes)
export type {
  PostType,
  PostTypeField,
  PostTypeFieldType,
  PostTypeFieldOptions,
  PostTypeFieldChoice,
  PostTypeRepeaterSubField,
  GalleryItem,
  AttachmentItem,
} from "./types/post-types.js";
export {
  POST_TYPE_FIELD_TYPES,
  isGalleryFieldValue,
  isAttachmentFieldValue,
  isRepeaterFieldValue,
} from "./types/post-types.js";

// Types — Contact
export type {
  ContactEnquirySubmission,
  ContactEnquiryResult,
} from "./types/contact.js";

// Types — Review
export type {
  ProductReview,
  ReviewSummary,
  CreateReviewRequest,
  ReviewContext,
} from "./types/review.js";

// Types — Service Package
export type { ServicePackageOrder } from "./types/service-package.js";

// Types — CMS
export type { CmsBlock, CmsPage, CmsPageSummary } from "./types/cms.js";

// Types — Portal
export type {
  CouponClaimSubmission,
  CouponClaimResult,
  PortalConfig,
  FeatureKey,
  AnalyticsConfig,
} from "./types/portal.js";

// Analytics
export {
  initAnalytics,
  trackPageView,
  trackPurchase,
  trackSignUp,
  trackLogin,
  trackBookingComplete,
  captureUtmParams,
} from "./analytics.js";
export type {
  PurchaseItem,
  PurchaseData,
  UtmParams,
} from "./analytics.js";

// Modules logic
export {
  MODULE_CODE_TO_FEATURE,
  ALL_FEATURE_KEYS,
  modulesToFeatures,
} from "./modules.js";

// Event logic
export {
  mapApiEvent,
  getAvailableEventDates,
  getPrimaryEventDate,
  isEventBookable,
  getMaxOrderQuantity,
  sortEventsForDisplay,
  formatEventPrice,
  formatEventDate,
  getDeliveryModeLabel,
  getEventAvailabilityLabel,
  stripHtml,
} from "./events.js";
export type {
  FormatEventPriceOptions,
  FormatEventDateOptions,
  EventAvailabilityLabels,
} from "./events.js";

// Booking logic
export {
  isFreeSpace,
  canMemberCancelBooking,
  scheduleSlotParam,
  extractScheduleOfferings,
  filterScheduleDays,
  buildScheduleGrid,
  countScheduleSessions,
} from "./bookings.js";
export type { MemberCancelEligibility } from "./bookings.js";

// Member logic
export { mapApiMember } from "./members.js";

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
} from "./shop.js";
export type { SearchMatchSegment } from "./shop.js";

// Checkout logic
export {
  calculateFinalTotal,
  validateCheckoutForm,
  buildCreateOrderRequest,
  computeShippingEligibility,
  pickDefaultShippingId,
} from "./checkout.js";
export type {
  CheckoutFormFields,
  PaymentOptions,
  ShippingEligibility,
} from "./checkout.js";

// Coupon logic
export { buildAppliedCoupon, getCouponErrorMessage } from "./coupon.js";

// Booking error logic
export {
  BOOKING_ERROR_CODES,
  getBookingErrorMessage,
} from "./booking-errors.js";
export type {
  BookingCooldownDetails,
  BookingOnHandDetails,
  BookingErrorMessageHandlers,
} from "./booking-errors.js";

// Types — Gift / Reward Redemption
export type {
  RedemptionStatus,
  FaceValueType,
  ApiGiftOfferSummary,
  ApiRewardRedemption,
  ApiRewardRedemptionList,
  RewardRedemption,
  GiftOfferSummary,
  ApiGiftOffer,
  ApiGiftOfferList,
  GiftOffer,
} from "./types/gift.js";

// Gift logic
export {
  mapApiGiftOfferSummary,
  mapApiGiftOffer,
  mapApiRedemption,
  getRedemptionStatusLabel,
  isRedemptionUsable,
  isRedemptionActionable,
  formatRedemptionExpiry,
  canAffordOffer,
} from "./gifts.js";
export type { AffordabilityResult } from "./gifts.js";

// Auth
export { AuthClient } from "./auth.js";
export type {
  OtpSendResponse,
  AuthTokenResponse,
  RegisterInput,
  LoginChannel,
  LoginChannelResponse,
  OtpIdentifier,
} from "./types/auth.js";

// API Client
export { FavCRM, FavCRMError } from "./client.js";
export type {
  FavCRMConfig,
  ProductListParams,
  CategoryListParams,
  TimeSlotsParams,
  TimeSlotsResponse,
  StaffMember,
  CustomerAiChatInput,
  CustomerAiConversation,
  CustomerAiStreamHandlers,
  CustomerAiToolCallStatus,
  CustomerAiUsage,
  PaymentGateway,
  PaymentIntentRequest,
  PaymentIntentResponse,
  BlogListParams,
  PaginatedResult,
} from "./client.js";

// Validation
export {
  validateEmail,
  validatePhone,
  validateOtp,
  validateRequired,
  validateRegistrationForm,
  validateEventRegistrationForm,
  validateContactForm,
} from "./validation.js";
export type { ValidationError } from "./validation.js";

// Content blocks — typed CMS block primitives, plugin registry, parse/migrate
export type {
  ContentBlockBase,
  AnyBlock,
  BlockType,
  DataOf,
  ParagraphBlock,
  HeadingBlock,
  ImageBlock,
  ListBlock,
  QuoteBlock,
  CodeBlock,
  DividerBlock,
  EmbedBlock,
  HtmlBlock,
  YoutubeBlock,
  FileBlock,
  FaqBlock,
  CalloutBlock,
  GalleryBlock,
  CtaBlock,
  AccordionBlock,
  ProductRefBlock,
  ColumnsBlock,
  UnknownBlock,
} from "./types/content-blocks.js";

export {
  BlockRegistry,
  CORE_BLOCKS,
  createDefaultRegistry,
  makeBlockId,
  blockValidators,
  paragraphPlugin,
  headingPlugin,
  imagePlugin,
  listPlugin,
  quotePlugin,
  codePlugin,
  dividerPlugin,
  embedPlugin,
  htmlPlugin,
  youtubePlugin,
  filePlugin,
  faqPlugin,
  calloutPlugin,
  galleryPlugin,
  ctaPlugin,
  accordionPlugin,
  productRefPlugin,
  columnsPlugin,
} from "./content-blocks/index.js";

export type {
  BlockPlugin,
  ValidationResult as BlockValidationResult,
  ParseResult as BlockParseResult,
} from "./content-blocks/registry.js";

export {
  htmlToBlocks,
  blocksToHtmlPreview,
  blocksToExcerpt,
  flattenBlocks,
} from "./content-blocks/legacy.js";

// Storefront workspace resolver — hostname → companyId
export { createWorkspaceResolver } from "./storefront-resolver.js";
export type {
  WorkspaceResolver,
  WorkspaceResolverOptions,
} from "./storefront-resolver.js";

// Types — Assistant agents (AI employees)
export type {
  AssistantAgentStatus,
  AssistantAgentRole,
  AssistantAgentCapabilities,
  AssistantAgent,
  AssistantAgentWithRole,
  CreateAgentInput,
  BootstrapStatus,
  BootstrapResult,
  AssistantAgentTemplate,
} from "./types/assistant-agent.js";

// Types — Agent channel bindings
export type {
  AgentReplyPolicy,
  AgentActiveHours,
  AgentBindingChannel,
  AgentChannelBinding,
  UpsertAgentChannelBindingInput,
} from "./types/agent-channel-binding.js";

// Types — Assistant usage
export type {
  AssistantUsageSummary,
  AssistantUsageAgentBreakdownRow,
} from "./types/assistant-usage.js";
