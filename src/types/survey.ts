export type SurveyStatus = "draft" | "published" | "closed" | "archived";
export type SurveyVisibilityMode = "public" | "members_only" | "token_only" | "private";
export type SurveyResponseStatus = "partial" | "completed";

export type SurveyQuestionBlockType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multi_choice"
  | "rating"
  | "nps"
  | "date"
  | "number"
  | "email"
  | "phone"
  | "statement"
  | "custom";

export interface SurveyQuestionOption {
  id: string;
  label: string;
  value: string;
  score?: number;
}

export interface SurveyQuestionValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface SurveyQuestionBranch {
  when: {
    operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
    value: unknown;
  };
  goToBlockId?: string;
  endSurvey?: boolean;
}

export interface SurveyQuestionBlock {
  id: string;
  type: SurveyQuestionBlockType;
  title: string;
  description?: string;
  helpText?: string;
  required?: boolean;
  options?: SurveyQuestionOption[];
  validation?: SurveyQuestionValidation;
  branches?: SurveyQuestionBranch[];
  metadata?: Record<string, unknown>;
}

export interface SurveySettings {
  submitLabel?: string;
  successMessage?: string;
  allowPartial?: boolean;
  allowAnonymous?: boolean;
  oneResponsePerAccount?: boolean;
  theme?: Record<string, unknown>;
}

export interface Survey {
  id: string;
  companyId: string;
  accountId: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: SurveyStatus;
  visibility: SurveyVisibilityMode;
  questionBlocks: SurveyQuestionBlock[];
  settings: SurveySettings;
  openAt: string | null;
  closeAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyInvitation {
  id: string;
  surveyId: string;
  accountId: string | null;
  contactId: string | null;
  expiresAt: string | null;
}

export interface SurveyPublicView {
  survey: Survey;
  invitation?: SurveyInvitation;
}

/**
 * Survey response attribution contract v1
 * (`metadata.attribution`, see api `docs/survey-response-attribution-v1.md`).
 * The provider validates, bounds, and re-sanitizes every field server-side;
 * unknown keys are stripped and `survey` context is stamped by the server.
 */
export type SurveyAttributionClickIdKey = "google" | "meta" | "tiktok";

export interface SurveyAttributionTouch {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmId?: string;
  utmContent?: string;
  utmTerm?: string;
  utmSourcePlatform?: string;
  clickIds?: Partial<Record<SurveyAttributionClickIdKey, string>>;
  landingUrl?: string;
  referrer?: string;
  /** ISO-8601 timestamp; required on every touch. */
  capturedAt: string;
  capturedVia: "hosted_form";
}

export interface SurveyResponseAttribution {
  schemaVersion: 1;
  firstTouch?: SurveyAttributionTouch | null;
  submissionTouch?: SurveyAttributionTouch | null;
  sessionId?: string;
  placement?: { pagePath?: string; form?: string };
  /** Stamped by the provider; any client-supplied value is discarded. */
  survey?: { id: string; slug: string; definitionUpdatedAt: string | null };
}

/**
 * Free-form response metadata with the reserved `attribution` namespace typed.
 * Other keys pass through to the provider untouched. `SurveyResponseSubmission`
 * keeps `metadata` loosely typed for backwards compatibility — consumers that
 * want the contract enforced can build against this shape directly.
 */
export type SurveyResponseMetadata = Record<string, unknown> & {
  attribution?: SurveyResponseAttribution;
};

export interface SurveyResponseSubmission {
  answers: Record<string, unknown>;
  scores?: Record<string, number>;
  metadata?: Record<string, unknown>;
  respondentName?: string;
  respondentEmail?: string;
  status?: SurveyResponseStatus;
  sessionId?: string;
  startedAt?: string;
  timeSpentSeconds?: number;
  /**
   * Client-generated idempotency key (8–128 chars, `[A-Za-z0-9_-]`).
   * Identical retries under one key return the recorded result once; a
   * changed payload under the same key is a 409 conflict.
   */
  submissionKey?: string;
  /** Resume a stored partial by row id — requires `resumeToken`. */
  responseId?: string;
  /**
   * Bearer proof authorizing resume. Either minted ahead of time via
   * `surveys.mintResumeCapability*` (recommended — survives a lost submit
   * reply) or returned once by the first accepted keyed submission.
   * Required for `responseId`-based resume and for a same-key mutation that
   * changes the payload.
   */
  resumeToken?: string;
}

/** Server-minted resume capability (64-hex bearer token). */
export interface SurveyResumeCapability {
  resumeToken: string;
}

export interface SurveyResponseResult {
  /** The response row id (wire field `id`). */
  id: string;
  duplicate: boolean;
  /** Present on providers that support the lifecycle contract. */
  status?: SurveyResponseStatus;
  /** Present once, on the first accepted keyed submission. */
  resumeToken?: string;
}
