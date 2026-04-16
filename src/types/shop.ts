import type { ReviewSummary } from "./review.js";

export interface ProductImage {
  id: number;
  src: string;
  name: string;
  alt: string;
  blurhash: string;
  thumbUrl: string;
  mediumUrl: string;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
}

export interface ProductOptionValue {
  id: number;
  value: string;
  position: number;
}

export interface ProductOption {
  id: number;
  name: string;
  position: number;
  required: boolean;
  values: ProductOptionValue[];
}

export interface ProductVariation {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  discountPrice: number | null;
  memberPrice: number | null;
  regularPrice: number;
  salePrice: number | null;
  onSale: boolean;
  seoTitle: string;
  shippingWeight: number | null;
  selectedOptions: { optionName: string; value: string }[];
  stockQuantity: number;
  stockStatus: string;
  parentId: number;
}

export interface CategoryRef {
  id: number;
  name: string;
  slug: string | null;
}

export interface Product {
  id: number;
  name: string;
  shortName: string | null;
  description: string | null;
  slug: string | null;
  sku: string | null;
  price: number;
  discountPrice: number | null;
  memberPrice: number | null;
  regularPrice: number;
  salePrice: number | null;
  onSale: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  shippingWeight: number | null;
  status: string;
  productType: string;
  stockQuantity: number;
  stockStatus: string;
  categories: CategoryRef[];
  isVariable: boolean;
  isVariation: boolean;
  parentProductId: number | null;
  images: ProductImage[];
  options: ProductOption[];
  selectedOptions: { optionName: string; value: string }[];
  variations: ProductVariation[];
  createdAt: string;
  updatedAt: string;
  reviewSummary?: ReviewSummary;
}

export interface ProductListItem {
  id: number;
  name: string;
  description: string;
  slug: string | null;
  price: number | null;
  discountPrice: number | null;
  memberPrice: number | null;
  seoTitle: string | null;
  status: string | null;
  productType: string;
  stockStatus: string;
  categoryName: string | null;
  categorySlug: string | null;
  categories: CategoryRef[];
  isVariable: boolean;
  image: string | null;
}

export interface CartItem {
  product: ProductListItem;
  quantity: number;
  variationId?: number;
  variationName?: string;
}

export interface ShopCategory {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  imageUrl: string | null;
  parentId: number | null;
  productCount: number;
}

export interface ShippingMethod {
  id: number;
  name: string;
  description: string | null;
  cost: number;
  freeShippingThreshold: number | null;
  estimatedDays: string | null;
}

export interface CreateOrderRequest {
  lineItems: { productId: number; quantity: number; variationId?: number }[];
  customerInfo: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  shippingAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  shippingMethodId?: number;
  promotionCode?: string;
  creditsUsed?: string;
  paymentMethodId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface PaymentMethodOption {
  id: string;
  name: string;
  type: string;
  instructions: string | null;
  hasGateway: boolean;
  position: number;
}

export interface ShopOrderItem {
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ShopOrder {
  id: number;
  orderId: string;
  orderNumber: string | null;
  status: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  items: ShopOrderItem[];
  createdAt: string;
  paymentUrl?: string;
  paymentInstructions?: string;
}

export interface SubscriptionPlan {
  id: string;
  productId: number;
  billingCycle: string;
  price: number;
  currency: string;
  trialDays: number;
  linkedPackageId: number | null;
  tokensPerCycle: number | null;
  gatewayPriceId: string | null;
  gatewayType: string | null;
  isActive: boolean;
}

export interface ProductSubscription {
  id: string;
  planId: string;
  productId: number;
  productName: string;
  billingCycle: string;
  status: string;
  subscriptionMode: string;
  amount: number;
  currency: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
  autoRenew: boolean;
  gatewaySubscriptionId: string | null;
  cancelledAt: string | null;
  createdAt: string;
}
