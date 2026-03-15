export interface CouponClaimSubmission {
  name: string;
  email?: string;
  phone?: string;
}

export interface CouponClaimResult {
  couponCode: string;
  expiresAt?: string;
  message: string;
}

export interface PortalConfig {
  portalType: string;
  brandName: string;
  brandUuid: string;
  portalToken: string;
  config: Record<string, unknown>;
}
