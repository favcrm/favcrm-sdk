export type MembershipEffectiveStatus = "active" | "expired" | "none";

export function deriveMembershipEffectiveStatus(input: {
  status?: string | null;
  expiresAt?: string | null;
} | null | undefined): MembershipEffectiveStatus {
  if (!input) return "none";
  if (input.status && input.status !== "active") {
    return input.status === "expired" ? "expired" : "none";
  }
  if (input.expiresAt && new Date(input.expiresAt) < new Date()) {
    return "expired";
  }
  return "active";
}

export function isMembershipActive(input: {
  status?: string | null;
  expiresAt?: string | null;
} | null | undefined): boolean {
  return deriveMembershipEffectiveStatus(input) === "active";
}

export function isMembershipExpiringSoon(
  expiresAt: string | null | undefined,
  withinDays = 30,
): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  const now = new Date();
  if (expiry <= now) return false;
  const diffMs = expiry.getTime() - now.getTime();
  return diffMs <= withinDays * 24 * 60 * 60 * 1000;
}

export function daysUntilMembershipExpiry(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
