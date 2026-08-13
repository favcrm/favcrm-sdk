import { FavCRMError } from "./client.js";
import type {
  FireClubAgentClientConfig,
  FireClubAgentCommandOptions,
  FireClubAgentCommandStorage,
  FireClubAgentIdentity,
  FireClubAgentLink,
  FireClubAgentLinkInput,
  FireClubAgentListParams,
  FireClubAgentLoginResult,
  FireClubAgentPage,
  FireClubAgentPasskeyAssertion,
  FireClubAgentPasskeyOptions,
  FireClubAgentSession,
  FireClubAgentTotpSetup,
  FireClubAgentVenue,
  FireClubAgentVenueDetail,
  FireClubAssignedCustomer,
  FireClubAssignedCustomerDetail,
} from "./types/fireclub-agent.js";

type FireClubAgentHttpMethod = "GET" | "POST";

interface FireClubAgentRequestOptions {
  body?: unknown;
  params?: Record<string, string>;
  idempotencyKey?: string;
}

const COMMAND_STORAGE_PREFIX = "favcrm:fireclub-agent-command:";
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function queryString(params?: Record<string, string>): string {
  if (!params) return "";
  const value = new URLSearchParams(params).toString();
  return value ? `?${value}` : "";
}

function listParams(params?: FireClubAgentListParams): Record<string, string> | undefined {
  if (!params) return undefined;
  const result: Record<string, string> = {};
  if (params.page !== undefined) result.page = String(params.page);
  if (params.limit !== undefined) result.limit = String(params.limit);
  if (params.search !== undefined) result.search = params.search;
  return Object.keys(result).length > 0 ? result : undefined;
}

export function createFireClubAgentCommandOptions(): FireClubAgentCommandOptions {
  return { idempotencyKey: crypto.randomUUID() };
}

export function getOrCreateFireClubAgentCommandOptions(
  storage: FireClubAgentCommandStorage,
  operation: string,
): FireClubAgentCommandOptions {
  const normalizedOperation = operation.trim();
  if (!normalizedOperation) {
    throw new Error("Fire Club Agent command operation is required");
  }
  const storageKey = `${COMMAND_STORAGE_PREFIX}${normalizedOperation}`;
  const existing = storage.getItem(storageKey);
  if (existing && UUID_V4_PATTERN.test(existing)) {
    return { idempotencyKey: existing };
  }
  const created = createFireClubAgentCommandOptions();
  storage.setItem(storageKey, created.idempotencyKey);
  return created;
}

export function clearFireClubAgentCommandOptions(
  storage: FireClubAgentCommandStorage,
  operation: string,
): void {
  const normalizedOperation = operation.trim();
  if (!normalizedOperation) return;
  storage.removeItem(`${COMMAND_STORAGE_PREFIX}${normalizedOperation}`);
}

export class FireClubAgentClient {
  private readonly config: FireClubAgentClientConfig;
  private readonly apiBase: string;
  private accessToken: string | null = null;

  readonly auth: FireClubAgentAuthClient;
  readonly venues: FireClubAgentVenuesClient;
  readonly customers: FireClubAgentCustomersClient;
  readonly links: FireClubAgentLinksClient;

  constructor(config: FireClubAgentClientConfig) {
    this.config = config;
    this.apiBase = `${config.baseUrl.replace(/\/$/, "")}/v6/fireclub-agent`;
    this.auth = new FireClubAgentAuthClient(this);
    this.venues = new FireClubAgentVenuesClient(this);
    this.customers = new FireClubAgentCustomersClient(this);
    this.links = new FireClubAgentLinksClient(this);
  }

  get companyId(): string {
    return this.config.companyId;
  }

  setToken(token: string): void {
    this.accessToken = token;
  }

  clearToken(): void {
    this.accessToken = null;
  }

  /** @internal Used by the scoped Fire Club Agent sub-clients. */
  async request<T>(
    method: FireClubAgentHttpMethod,
    path: string,
    options?: FireClubAgentRequestOptions,
  ): Promise<T> {
    const maxRetries = method === "GET" ? 2 : 0;
    const retryableStatuses = new Set([429, 502, 503, 504]);
    const retryDelays = [200, 600];
    let lastError: FavCRMError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (attempt > 0) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, retryDelays[attempt - 1] ?? 600),
        );
      }
      const result = await this.requestOnce<T>(method, path, options);
      if (result.ok) return result.value;
      lastError = result.error;
      if (!retryableStatuses.has(result.error.status)) break;
    }
    throw lastError ?? new FavCRMError(500, "Request failed");
  }

  private async requestOnce<T>(
    method: FireClubAgentHttpMethod,
    path: string,
    options?: FireClubAgentRequestOptions,
  ): Promise<{ ok: true; value: T } | { ok: false; error: FavCRMError }> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Company-Id": this.config.companyId,
    };
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    if (options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const controller = new AbortController();
    const timeoutMs = this.config.timeoutMs ?? 30_000;
    const timer = timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
    let response: Response;
    try {
      response = await (this.config.fetch ?? globalThis.fetch)(
        `${this.apiBase}${path}${queryString(options?.params)}`,
        {
          method,
          headers,
          body: options?.body === undefined
            ? undefined
            : JSON.stringify(options.body),
          signal: controller.signal,
        },
      );
    } finally {
      if (timer !== null) clearTimeout(timer);
    }

    if (response.status === 401) this.config.onUnauthorized?.();
    if (!response.ok) {
      let message = response.statusText || `HTTP ${response.status}`;
      let code: string | undefined;
      try {
        const body = await response.json() as {
          error?: { message?: string; code?: string };
          message?: string;
        };
        message = body.error?.message ?? body.message ?? message;
        code = body.error?.code;
      } catch {
        // Keep the status-derived fallback when an error body is not JSON.
      }
      return {
        ok: false,
        error: new FavCRMError(response.status, message, code),
      };
    }

    if (response.status === 204) {
      return { ok: true, value: undefined as T };
    }
    const body = await response.json() as { success?: boolean; data?: T } | T;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      return { ok: true, value: body.data as T };
    }
    return { ok: true, value: body as T };
  }
}

export class FireClubAgentAuthClient {
  constructor(private readonly client: FireClubAgentClient) {}

  login(email: string, password: string): Promise<FireClubAgentLoginResult> {
    return this.client.request("POST", "/auth/login", {
      body: { email, password, companyId: this.client.companyId },
    });
  }

  refresh(refreshToken: string): Promise<FireClubAgentSession> {
    return this.client.request("POST", "/auth/refresh", {
      body: { refreshToken },
    });
  }

  logout(refreshToken: string): Promise<{ loggedOut: true }> {
    return this.client.request("POST", "/auth/logout", {
      body: { refreshToken },
    });
  }

  verifyTotp(mfaToken: string, code: string): Promise<FireClubAgentSession> {
    return this.client.request("POST", "/auth/login/2fa/totp/verify", {
      body: { mfaToken, code },
    });
  }

  getPasskeyOptions(mfaToken: string): Promise<FireClubAgentPasskeyOptions> {
    return this.client.request("POST", "/auth/login/2fa/passkey/options", {
      body: { mfaToken },
    });
  }

  verifyPasskey(
    mfaToken: string,
    challengeKey: string,
    assertion: FireClubAgentPasskeyAssertion,
  ): Promise<FireClubAgentSession> {
    return this.client.request("POST", "/auth/login/2fa/passkey/verify", {
      body: { ...assertion, mfaToken, challengeKey },
    });
  }

  setupTotp(mfaToken: string): Promise<FireClubAgentTotpSetup> {
    return this.client.request("POST", "/auth/login/2fa/enroll/totp/setup", {
      body: { mfaToken },
    });
  }

  verifyTotpEnrollment(
    mfaToken: string,
    code: string,
  ): Promise<FireClubAgentSession> {
    return this.client.request("POST", "/auth/login/2fa/enroll/totp/verify", {
      body: { mfaToken, code },
    });
  }

  me(): Promise<FireClubAgentIdentity> {
    return this.client.request("GET", "/auth/me");
  }
}

export class FireClubAgentVenuesClient {
  constructor(private readonly client: FireClubAgentClient) {}

  list(
    params?: FireClubAgentListParams,
  ): Promise<FireClubAgentPage<FireClubAgentVenue>> {
    return this.client.request("GET", "/venues", { params: listParams(params) });
  }

  get(slug: string): Promise<FireClubAgentVenueDetail> {
    return this.client.request("GET", `/venues/${encodeURIComponent(slug)}`);
  }
}

export class FireClubAgentCustomersClient {
  constructor(private readonly client: FireClubAgentClient) {}

  list(
    params?: FireClubAgentListParams,
  ): Promise<FireClubAgentPage<FireClubAssignedCustomer>> {
    return this.client.request("GET", "/customers", { params: listParams(params) });
  }

  get(id: string): Promise<FireClubAssignedCustomerDetail> {
    return this.client.request("GET", `/customers/${encodeURIComponent(id)}`);
  }
}

export class FireClubAgentLinksClient {
  constructor(private readonly client: FireClubAgentClient) {}

  list(): Promise<FireClubAgentLink[]> {
    return this.client.request("GET", "/links");
  }

  issue(
    input: FireClubAgentLinkInput,
    options: FireClubAgentCommandOptions,
  ): Promise<FireClubAgentLink> {
    return this.client.request("POST", "/links", {
      body: input,
      idempotencyKey: options.idempotencyKey,
    });
  }

  revoke(
    id: string,
    options: FireClubAgentCommandOptions,
  ): Promise<FireClubAgentLink> {
    return this.client.request(
      "POST",
      `/links/${encodeURIComponent(id)}/revoke`,
      { idempotencyKey: options.idempotencyKey },
    );
  }
}
