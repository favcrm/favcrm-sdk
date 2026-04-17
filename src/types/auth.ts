export interface OtpSendResponse {
  message: string;
}

export interface AuthTokenResponse {
  token: string;
  accessToken: string;
  memberUuid: string;
  memberName: string;
  phone: string;
  pendingTierId?: string;
  tierPrice?: number;
}

export interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  ageRange?: string;
  address?: string;
  district?: string;
  agreeToReceivePromotion?: boolean;
  agreeToTerms?: boolean;
  referredByPhone?: string;
  referredByAccountId?: string;
  tierId?: string;
  source?: string;
  utm_data?: Record<string, unknown> | null;
}
