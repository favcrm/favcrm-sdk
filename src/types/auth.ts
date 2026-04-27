export type LoginChannel = "whatsapp" | "sms" | "email";

/**
 * Identifier passed to sendOtp / verifyOtp. The merchant's configured
 * loginChannel determines which kind is accepted.
 *  - whatsapp / sms → phone
 *  - email          → email
 *
 * Passing a bare string is shorthand for `{ phone: string }`.
 */
export type OtpIdentifier = { phone: string } | { email: string };

export interface OtpSendResponse {
  message: string;
}

export interface LoginChannelResponse {
  channel: LoginChannel;
}

export interface AuthTokenResponse {
  token: string;
  accessToken: string;
  memberUuid: string;
  memberName: string;
  phone?: string;
  email?: string;
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
