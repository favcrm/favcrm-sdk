import type { FavCRM } from "./client.js";
import type {
  AuthTokenResponse,
  OtpSendResponse,
  RegisterInput,
} from "./types/auth.js";

export class AuthClient {
  constructor(private sdk: FavCRM) {}

  sendOtp(phone: string): Promise<OtpSendResponse> {
    return this.sdk.request<OtpSendResponse>("POST", "/auth/otp", {
      body: { phone, companyId: this.sdk.companyId },
    });
  }

  verifyOtp(phone: string, otp: string): Promise<AuthTokenResponse> {
    return this.sdk.request<AuthTokenResponse>("POST", "/auth/otp/verify", {
      body: { phone, otp },
    });
  }

  register(data: RegisterInput): Promise<AuthTokenResponse> {
    return this.sdk.request<AuthTokenResponse>("POST", "/auth/register", {
      body: { ...data, companyId: this.sdk.companyId },
    });
  }
}
