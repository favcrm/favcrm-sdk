import type { FavCRM } from "./client.js";
import type {
  SupportAnalysisResult,
  SupportAnalyzeInput,
  SupportContinueInput,
  SupportContinueResult,
  SupportIntakeConfig,
  SupportSubmitInput,
  SupportTicketResult,
} from "./types/support.js";

/**
 * Public support intake (`/v6/customer-portal/support/*`).
 *
 * Company-scoped and visitor-friendly: every call carries `X-Company-Id`
 * (handled by the client), so tickets can be filed with only `visitorData`
 * for identity. If a customer JWT is set via `sdk.setToken()`, it is sent too
 * and takes precedence. The flow is:
 *
 *   1. `analyze()`  — describe the issue → AI summary + clarification questions
 *   2. `continue()` — answer questions (repeat until `isComplete`)
 *   3. `submit()`   — file the ticket
 *
 * `config()` returns categories + feature flags for rendering the intake form.
 */
export class SupportClient {
  constructor(private sdk: FavCRM) {}

  config(): Promise<SupportIntakeConfig> {
    return this.sdk.request<SupportIntakeConfig>("GET", "/support/config");
  }

  analyze(input: SupportAnalyzeInput): Promise<SupportAnalysisResult> {
    return this.sdk.request<SupportAnalysisResult>("POST", "/support/analyze", { body: input });
  }

  continue(input: SupportContinueInput): Promise<SupportContinueResult> {
    return this.sdk.request<SupportContinueResult>("POST", "/support/continue", { body: input });
  }

  submit(input: SupportSubmitInput): Promise<SupportTicketResult> {
    return this.sdk.request<SupportTicketResult>("POST", "/support/submit", { body: input });
  }
}
