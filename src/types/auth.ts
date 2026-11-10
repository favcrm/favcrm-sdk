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
  refreshToken?: string;
  expiresIn?: number;
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
  /**
   * Proof that the caller just verified this phone by OTP. Required when the
   * phone belongs to a WhatsApp contact that has not registered yet; obtain it
   * from the `REGISTRATION_REQUIRED` error of `verifyOtp`.
   */
  registrationTicket?: string;
}

/**
 * Customer auth outcomes for WhatsApp contacts that are not registered members:
 * - `verifyOtp` → 403 `REGISTRATION_REQUIRED` (details: {@link RegistrationRequiredDetails}); no token.
 * - `register` → 409 `PHONE_VERIFICATION_REQUIRED` (details: `{ phone }`) without a valid ticket.
 * - either → 409 `REGISTRATION_REVIEW_REQUIRED` when several records share the phone.
 */
export const CustomerAuthErrorCodes = {
  REGISTRATION_REQUIRED: "REGISTRATION_REQUIRED",
  PHONE_VERIFICATION_REQUIRED: "PHONE_VERIFICATION_REQUIRED",
  REGISTRATION_REVIEW_REQUIRED: "REGISTRATION_REVIEW_REQUIRED",
} as const;

/** `FavCRMError.details` of a `REGISTRATION_REQUIRED` error. */
export interface RegistrationRequiredDetails {
  /** Present for phone OTP only; single use, valid `expiresIn` seconds. */
  registrationTicket?: string;
  name: string | null;
  phone: string | null;
  expiresIn: number;
}
