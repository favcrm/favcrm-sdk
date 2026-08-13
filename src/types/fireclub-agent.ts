export interface FireClubAgentClientConfig {
  baseUrl: string;
  companyId: string;
  onUnauthorized?: () => void;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export interface FireClubAgentUser {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  role: "agent";
}

export interface FireClubAgentCompany {
  id: string;
  name: string;
  slug: string;
}

export interface FireClubAgentSession {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: FireClubAgentUser;
  company: FireClubAgentCompany;
}

export type FireClubAgentMfaMethod = "totp" | "passkey";

export interface FireClubAgentMfaChallenge {
  requiresTwoFactor: true;
  mfaToken: string;
  methods: FireClubAgentMfaMethod[];
  hasBackupCodes: boolean;
  mustEnroll: boolean;
}

export type FireClubAgentLoginResult =
  | FireClubAgentSession
  | FireClubAgentMfaChallenge;

export interface FireClubAgentIdentity {
  userId: string;
  companyId: string;
  memberId: string;
  role: "agent";
}

export interface FireClubAgentTotpSetup {
  secret: string;
  otpauthUri: string;
  backupCodes: string[];
}

export interface FireClubAgentPasskeyOptions {
  challenge: string;
  challengeKey: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<Record<string, unknown>>;
  userVerification?: string;
  [key: string]: unknown;
}

export interface FireClubAgentPasskeyAssertion {
  id: string;
  rawId: string;
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle?: string;
  };
  type: "public-key";
  clientExtensionResults: Record<string, unknown>;
  authenticatorAttachment?: "cross-platform" | "platform";
}

export interface FireClubAgentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FireClubAgentPage<T> {
  items: T[];
  pagination: FireClubAgentPagination;
}

export interface FireClubAgentListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface FireClubAgentVenueTag {
  id: string;
  name: string;
  color: string | null;
}

export interface FireClubAgentVenue {
  id: string;
  type: "venue";
  title: string;
  slug: string;
  excerpt: string | null;
  status: "published";
  visibility: "public";
  featuredImage: string | null;
  authorId: string | null;
  parentId: string | null;
  sortOrder: number;
  publishedAt: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  tags: FireClubAgentVenueTag[];
}

export interface FireClubAgentVenueDetail extends FireClubAgentVenue {
  companyId: string;
  blocks: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  deletedAt: null;
  deletedBy: string | null;
  categories: unknown[];
}

export interface FireClubAssignedCustomer {
  id: string;
  name: string;
  lifeStage: string;
  assignedAt: string | null;
  updatedAt: string;
  maskedEmail: string | null;
  maskedPhone: string | null;
}

export interface FireClubAssignedCustomerMembership {
  status: string;
  memberSince: string | null;
  expiresAt: string | null;
  tierName: string | null;
}

export interface FireClubAssignedCustomerRegistration {
  id: string;
  status: string;
  quantity: number;
  createdAt: string;
  eventSlug: string;
  eventTitle: string;
  startDate: string | null;
}

export interface FireClubAssignedCustomerDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lifeStage: string;
  assignedAt: string | null;
  latestFollowUpStatus: string | null;
  updatedAt: string;
  membership: FireClubAssignedCustomerMembership | null;
  eventRegistrations: FireClubAssignedCustomerRegistration[];
}

export type FireClubAgentLinkStatus = "active" | "expired" | "revoked";

export interface FireClubAgentLink {
  id: string;
  targetPath: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  registrationsCount: number;
  createdAt: string;
  updatedAt: string;
  status: FireClubAgentLinkStatus;
  token: string | null;
}

export interface FireClubAgentLinkInput {
  eventSlug: string;
  expiresInDays?: number;
}

export interface FireClubAgentCommandOptions {
  /** Stable cryptographically random key reused only for retries of one command. */
  idempotencyKey: string;
}

export interface FireClubAgentCommandStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
