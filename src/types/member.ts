export interface MembershipTier {
  id: string;
  name: string;
  level: number;
  color: string;
  benefits: string[];
  spendingProgress?: {
    currentSpending: number;
    requiredSpending: number;
    nextTier: string | null;
  };
}

export interface Member {
  uuid: string;
  name: string;
  email: string | null;
  phone: string;
  avatarUrl: string | null;
  membershipTier: MembershipTier | null;
}

/** Raw membership tier shape from the v6 API (CamelCaseJSONRenderer). */
export interface ApiMembershipTier {
  id: number;
  name: string;
  spendingCount: number;
  totalSpendingAmount: number;
  description: string | null;
  multiplier: number;
  discount: number;
  priority: number | null;
  isUpgradeable: boolean;
  paymentGateway: string;
  gatewayProductId: string | null;
  gatewayPriceId: string | null;
  validPeriodValue: number;
  validPeriodUnit: string;
  createdAt: string;
  updatedAt: string;
}

/** Raw member shape from the v6 profile endpoint (CamelCaseJSONRenderer). */
export interface ApiMember {
  id: number;
  code: string | null;
  name: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  points: number;
  stamps: number;
  uuid: string;
  agreeToReceivePromotion: boolean;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
  membershipTier: ApiMembershipTier | null;
}

export interface CardSettings {
  brandName: string;
  brandLogoUrl: string | null;
  brandColor: string;
  cardBackgroundUrl: string | null;
  showQrCode: boolean;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface RegistrationField {
  key: string;
  label: string;
  type: 'text' | 'phone' | 'email' | 'select' | 'date' | 'checkbox';
  required: boolean;
  enabled: boolean;
  order: number;
  checkboxLabel?: string;
}

export interface RegistrationFormConfig {
  fields: RegistrationField[];
  defaultCountryCode: string;
}

export interface ReferralLookupResult {
  accountId: string;
  name: string;
}

export interface RegistrationSubmission {
  name: string;
  lastName?: string;
  phone: string;
  email?: string;
  birthMonthAndDay?: string; // "MMDD"
  gender?: 'M' | 'F' | 'O';
  agreeToReceivePromotion: boolean;
  agreeToPrivacyPolicy: boolean;
  membershipTier?: number;
  source?: string;
  utmData?: Record<string, string>;
}

export interface RegistrationResult {
  id: number;
  uuid: string;
  code: string;
  name: string;
  email?: string;
  phone: string;
  membershipTier: { id: number; name: string };
  token: string;
}
