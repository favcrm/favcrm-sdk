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
  stockQuantity: number;
  stockStatus: string;
  categoryId: number | null;
  categoryName: string | null;
  categories: CategoryRef[];
  isVariable: boolean;
  isVariation: boolean;
  parentProductId: number | null;
  images: ProductImage[];
  options: ProductOption[];
  selectedOptions: { optionName: string; value: string }[];
  variations: ProductVariation[];
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
  stockStatus: string;
  categoryName: string | null;
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
  productCount: number;
}

export interface ShippingMethod {
  id: number;
  name: string;
  description: string;
  cost: number;
  calculationType: string;
  freeShippingThreshold: number | null;
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
}
