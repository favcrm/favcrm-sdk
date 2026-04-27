import type { FavCRM } from "./client.js";
import type {
  AuthTokenResponse,
  LoginChannelResponse,
  OtpIdentifier,
  OtpSendResponse,
  RegisterInput,
} from "./types/auth.js";

function toIdentifier(
  input: string | OtpIdentifier,
): { phone?: string; email?: string } {
  if (typeof input === "string") return { phone: input };
  return "email" in input ? { email: input.email } : { phone: input.phone };
}

export class AuthClient {
  constructor(private sdk: FavCRM) {}

  /**
   * Send a one-time login code. Pass a phone string for the legacy
   * phone+WhatsApp flow, or `{ email }` / `{ phone }` to choose explicitly.
   * The merchant's configured loginChannel must match — see `getLoginChannel()`.
   */
  sendOtp(identifier: string | OtpIdentifier): Promise<OtpSendResponse> {
    return this.sdk.request<OtpSendResponse>("POST", "/auth/otp", {
      body: { ...toIdentifier(identifier), companyId: this.sdk.companyId },
    });
  }

  /**
   * Verify the OTP and exchange for tokens. Identifier must match the one
   * used in `sendOtp`.
   */
  verifyOtp(
    identifier: string | OtpIdentifier,
    otp: string,
  ): Promise<AuthTokenResponse> {
    return this.sdk.request<AuthTokenResponse>("POST", "/auth/otp/verify", {
      body: { ...toIdentifier(identifier), otp },
    });
  }

  /**
   * Get the merchant's configured login channel. Call this on the login
   * screen to know whether to render a phone or email input.
   */
  getLoginChannel(): Promise<LoginChannelResponse> {
    return this.sdk.request<LoginChannelResponse>("GET", "/auth/login-channel", {
      params: { companyId: this.sdk.companyId },
    });
  }

  register(data: RegisterInput): Promise<AuthTokenResponse> {
    return this.sdk.request<AuthTokenResponse>("POST", "/auth/register", {
      body: { ...data, companyId: this.sdk.companyId },
    });
  }
}
