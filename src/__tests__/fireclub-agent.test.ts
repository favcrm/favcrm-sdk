import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FireClubAgentClient,
  clearFireClubAgentCommandOptions,
  createFireClubAgentCommandOptions,
  getOrCreateFireClubAgentCommandOptions,
} from "../index.js";

function envelope<T>(data: T) {
  return { success: true, data };
}

function response(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: vi.fn(async () => data),
  } as unknown as Response;
}

describe("FireClubAgentClient", () => {
  let fetch: ReturnType<typeof vi.fn>;
  let client: FireClubAgentClient;

  beforeEach(() => {
    fetch = vi.fn(async () => response(envelope({})));
    client = new FireClubAgentClient({
      baseUrl: "https://api.example.test/",
      companyId: "wolo-company",
      fetch,
    });
  });

  it("uses only the dedicated Agent API base and injects company login scope", async () => {
    fetch.mockResolvedValueOnce(response(envelope({
      requiresTwoFactor: true,
      mfaToken: "mfa-token",
      methods: ["totp"],
      hasBackupCodes: false,
      mustEnroll: false,
    })));

    await client.auth.login("agent@example.test", "secret");

    expect(fetch.mock.calls[0][0]).toBe(
      "https://api.example.test/v6/fireclub-agent/auth/login",
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      email: "agent@example.test",
      password: "secret",
      companyId: "wolo-company",
    });
  });

  it("keeps its Agent bearer token independent and sends it to scoped reads", async () => {
    client.setToken("agent-access-token");
    await client.customers.list({ page: 2, limit: 20, search: "Ada Wong" });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(
      "https://api.example.test/v6/fireclub-agent/customers?page=2&limit=20&search=Ada+Wong",
    );
    expect(init.headers.Authorization).toBe("Bearer agent-access-token");
    expect(init.headers["X-Company-Id"]).toBe("wolo-company");
  });

  it("covers venue and assigned-Customer detail routes", async () => {
    await client.venues.list();
    await client.venues.get("central-studio");
    await client.customers.get("8e6634a1-4052-4ddf-a70f-827a62949ef0");

    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      "https://api.example.test/v6/fireclub-agent/venues",
      "https://api.example.test/v6/fireclub-agent/venues/central-studio",
      "https://api.example.test/v6/fireclub-agent/customers/8e6634a1-4052-4ddf-a70f-827a62949ef0",
    ]);
  });

  it("requires caller-owned stable idempotency keys for link issue and revoke", async () => {
    const issueOptions = {
      idempotencyKey: "58847a36-9e05-4f79-a915-e173b79a575c",
    };
    const revokeOptions = {
      idempotencyKey: "c1288b66-c67c-4c89-b4b0-c0e0d5166fc2",
    };

    await client.links.issue(
      { eventSlug: "wealth-workshop", expiresInDays: 7 },
      issueOptions,
    );
    await client.links.revoke(
      "0f4ee96a-b212-4ae8-8f1c-8dc6bb833fc6",
      revokeOptions,
    );

    expect(fetch.mock.calls[0][1].headers["Idempotency-Key"])
      .toBe(issueOptions.idempotencyKey);
    expect(fetch.mock.calls[1][1].headers["Idempotency-Key"])
      .toBe(revokeOptions.idempotencyKey);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      eventSlug: "wealth-workshop",
      expiresInDays: 7,
    });
  });

  it("persists one cryptographically random command key across retries", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    const first = getOrCreateFireClubAgentCommandOptions(storage, "issue:workshop");
    const retry = getOrCreateFireClubAgentCommandOptions(storage, "issue:workshop");
    expect(retry).toEqual(first);
    expect(first.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);

    clearFireClubAgentCommandOptions(storage, "issue:workshop");
    const nextOperation = getOrCreateFireClubAgentCommandOptions(
      storage,
      "issue:workshop",
    );
    expect(nextOperation.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(createFireClubAgentCommandOptions().idempotencyKey)
      .not.toBe(nextOperation.idempotencyKey);
  });

  it("covers MFA completion and session lifecycle endpoints", async () => {
    await client.auth.verifyTotp("mfa", "123456");
    await client.auth.getPasskeyOptions("mfa");
    await client.auth.setupTotp("mfa");
    await client.auth.verifyTotpEnrollment("mfa", "123456");
    await client.auth.refresh("refresh-token");
    await client.auth.me();
    await client.auth.logout("refresh-token");

    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      "https://api.example.test/v6/fireclub-agent/auth/login/2fa/totp/verify",
      "https://api.example.test/v6/fireclub-agent/auth/login/2fa/passkey/options",
      "https://api.example.test/v6/fireclub-agent/auth/login/2fa/enroll/totp/setup",
      "https://api.example.test/v6/fireclub-agent/auth/login/2fa/enroll/totp/verify",
      "https://api.example.test/v6/fireclub-agent/auth/refresh",
      "https://api.example.test/v6/fireclub-agent/auth/me",
      "https://api.example.test/v6/fireclub-agent/auth/logout",
    ]);
  });
});
