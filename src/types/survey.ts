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
}

export interface SurveyResponseResult {
  responseId: string;
  duplicate?: boolean;
}
