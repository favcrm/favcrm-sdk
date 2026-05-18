/**
 * Workspace resolver — maps a storefront deployment's own hostname to its
 * FavCRM workspace (`companyId`), so a deployment can identify its workspace
 * at request time instead of hard-coding a `companyId` env var.
 *
 * Framework-agnostic: a SvelteKit `hooks.server.ts`, a Next.js middleware, or
 * any server runtime calls `resolve(hostname, fetch)` and stashes the result.
 *
 * Backs the public `GET /v6/customer-portal/storefront/resolve-domain`
 * endpoint. Registered hostnames are managed via `/v6/dev/verify` (auto on
 * signup) or `/v6/merchant/storefront-domains`.
 *
 * @example
 * ```ts
 * // one module-level instance, reused across requests
 * const resolver = createWorkspaceResolver({ apiUrl: "https://api.favcrm.io" });
 *
 * // in a per-request server hook
 * const companyId =
 *   (await resolver.resolve(url.hostname, fetch)) ?? ENV_COMPANY_ID;
 * ```
 */

/** Hosts that never resolve remotely — local development. */
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "",
]);

/** Default cache lifetime for a resolution (hit or miss). */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** Default per-request fetch timeout. */
const DEFAULT_TIMEOUT_MS = 3000;

export interface WorkspaceResolverOptions {
  /** FavCRM API base URL, e.g. `https://api.favcrm.io`. Trailing slash optional. */
  apiUrl: string;
  /**
   * How long a resolution — hit *or* miss — is cached. Default 5 minutes.
   * A miss is cached too, so an unregistered host is not re-fetched per request.
   */
  ttlMs?: number;
  /**
   * Abort the resolve request after this many ms. Default 3000.
   *
   * The resolver runs inside a server hook before the page renders, so a hung
   * API would otherwise stall every cold request. On timeout the resolution is
   * treated as a miss and the caller falls back to its env var / demo mode.
   */
  timeoutMs?: number;
}

export interface WorkspaceResolver {
  /**
   * Resolve a deployment hostname to its workspace `companyId`.
   *
   * Returns `null` for a local host, an unregistered hostname, or any
   * network/parse error — never throws, so callers can fall back cleanly.
   *
   * @param hostname - The request hostname (a port suffix is stripped).
   * @param fetchFn  - Fetch implementation; defaults to `globalThis.fetch`.
   *                   Pass the framework's request-scoped `fetch` when available.
   */
  resolve(
    hostname: string,
    fetchFn?: typeof globalThis.fetch,
  ): Promise<string | null>;
  /** Drop all cached resolutions. Mainly for tests. */
  clear(): void;
}

/**
 * Create a workspace resolver with its own in-memory cache. Construct one per
 * process (module scope) and reuse it — the cache is what keeps resolution off
 * the network on most requests.
 */
export function createWorkspaceResolver(
  options: WorkspaceResolverOptions,
): WorkspaceResolver {
  const apiUrl = options.apiUrl.replace(/\/$/, "");
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cache = new Map<
    string,
    { companyId: string | null; expiresAt: number }
  >();

  return {
    async resolve(hostname, fetchFn) {
      const host = hostname.trim().toLowerCase().split(":")[0];
      if (LOCAL_HOSTS.has(host)) return null;

      const cached = cache.get(host);
      if (cached && cached.expiresAt > Date.now()) return cached.companyId;

      const doFetch = fetchFn ?? globalThis.fetch;
      let companyId: string | null = null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const url = `${apiUrl}/v6/customer-portal/storefront/resolve-domain?hostname=${encodeURIComponent(
          host,
        )}`;
        const res = await doFetch(url, { signal: controller.signal });
        if (res.ok) {
          const body = (await res.json()) as {
            data?: { companyId?: string };
          };
          companyId = body.data?.companyId ?? null;
        }
      } catch {
        // Network/parse failure or timeout — treat as unresolved so the
        // caller falls back.
        companyId = null;
      } finally {
        clearTimeout(timer);
      }

      cache.set(host, { companyId, expiresAt: Date.now() + ttlMs });
      return companyId;
    },

    clear() {
      cache.clear();
    },
  };
}
