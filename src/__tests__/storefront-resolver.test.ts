import { describe, it, expect, vi } from "vitest";
import { createWorkspaceResolver } from "../storefront-resolver.js";

/** Mock fetch returning the resolve-domain success envelope. */
function okFetch(companyId: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: { companyId } }),
  });
}

/** Mock fetch returning a 404 (hostname not registered). */
function notFoundFetch() {
  return vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ success: false }),
  });
}

const API = "https://api.test.favcrm.io";

describe("createWorkspaceResolver", () => {
  it("resolves a registered hostname to its companyId", async () => {
    const fetchFn = okFetch("company-abc");
    const resolver = createWorkspaceResolver({ apiUrl: API });

    const result = await resolver.resolve("blog.example.com", fetchFn);

    expect(result).toBe("company-abc");
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0][0]).toBe(
      `${API}/v6/customer-portal/storefront/resolve-domain?hostname=blog.example.com`,
    );
  });

  it("returns null for an unregistered hostname (404)", async () => {
    const resolver = createWorkspaceResolver({ apiUrl: API });
    const result = await resolver.resolve("nope.example.com", notFoundFetch());
    expect(result).toBeNull();
  });

  it("returns null for local hosts without fetching", async () => {
    const fetchFn = okFetch("company-abc");
    const resolver = createWorkspaceResolver({ apiUrl: API });

    for (const host of ["localhost", "127.0.0.1", "0.0.0.0", "::1", ""]) {
      expect(await resolver.resolve(host, fetchFn)).toBeNull();
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("lowercases the hostname and strips the port", async () => {
    const fetchFn = okFetch("company-abc");
    const resolver = createWorkspaceResolver({ apiUrl: API });

    await resolver.resolve("Blog.Example.com:5173", fetchFn);

    expect(fetchFn.mock.calls[0][0]).toContain("hostname=blog.example.com");
  });

  it("caches a hit — a second call does not fetch", async () => {
    const fetchFn = okFetch("company-abc");
    const resolver = createWorkspaceResolver({ apiUrl: API });

    await resolver.resolve("blog.example.com", fetchFn);
    const second = await resolver.resolve("blog.example.com", fetchFn);

    expect(second).toBe("company-abc");
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("caches a miss — an unregistered host is not re-fetched", async () => {
    const fetchFn = notFoundFetch();
    const resolver = createWorkspaceResolver({ apiUrl: API });

    await resolver.resolve("nope.example.com", fetchFn);
    await resolver.resolve("nope.example.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("re-fetches after the TTL expires", async () => {
    vi.useFakeTimers();
    const fetchFn = okFetch("company-abc");
    const resolver = createWorkspaceResolver({ apiUrl: API, ttlMs: 1000 });

    await resolver.resolve("blog.example.com", fetchFn);
    vi.advanceTimersByTime(1500);
    await resolver.resolve("blog.example.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("returns null on a network error — never throws", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network down"));
    const resolver = createWorkspaceResolver({ apiUrl: API });

    await expect(
      resolver.resolve("blog.example.com", fetchFn),
    ).resolves.toBeNull();
  });

  it("clear() drops cached resolutions", async () => {
    const fetchFn = okFetch("company-abc");
    const resolver = createWorkspaceResolver({ apiUrl: API });

    await resolver.resolve("blog.example.com", fetchFn);
    resolver.clear();
    await resolver.resolve("blog.example.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("tolerates a trailing slash on apiUrl", async () => {
    const fetchFn = okFetch("company-abc");
    const resolver = createWorkspaceResolver({ apiUrl: `${API}/` });

    await resolver.resolve("blog.example.com", fetchFn);

    expect(fetchFn.mock.calls[0][0]).toBe(
      `${API}/v6/customer-portal/storefront/resolve-domain?hostname=blog.example.com`,
    );
  });
});
