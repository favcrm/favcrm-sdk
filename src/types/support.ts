// Types — Public Support Intake (customer-portal /support/*)
//
// Mirrors the response shapes of the company-scoped public support intake:
// an AI-assisted flow (analyze → clarify → submit) that files a support ticket
// into FavCRM's platform-support desk. See `SupportClient`.

export type SupportQuestionType = "single_choice" | "multi_choice" | "text" | "rating";

export interface SupportIntakeQuestion {
  id: string;
  question: string;
  type: SupportQuestionType;
  options?: string[];
  required: boolean;
}

export interface SupportIntakeAnalysis {
  type: string;
  sentiment: string;
  prioritySuggestion: string;
  summary: string;
  suggestedTitle: string;
  allAnswers?: Record<string, string | string[]>;
}

export interface SupportIntakeCategory {
  value: string;
  label: string;
  isActive: boolean;
}

export interface SupportIntakeConfig {
  categories: SupportIntakeCategory[];
  features: {
    aiEnabled: boolean;
    allowAttachments: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SupportAnalyzeInput {
  /** Client-generated id that groups one intake conversation. */
  sessionId: string;
  feedback: string;
  category?: string;
  /** Reporter identity when there is no authenticated customer token. */
  visitorData?: { email?: string; name?: string };
  pageUrl?: string;
  userAgent?: string;
  appVersion?: string;
}

export interface SupportAnalysisResult {
  analysisSessionId: string;
  analysis: SupportIntakeAnalysis;
  questions: SupportIntakeQuestion[];
  canSkip: boolean;
  isComplete: boolean;
  round: number;
  maxRounds: number;
  aiUsed: boolean;
  aiFailureReason?: string;
}

export interface SupportContinueInput {
  sessionId: string;
  analysisSessionId: string;
  answers: Record<string, string | string[]>;
  skipRemaining?: boolean;
}

export interface SupportContinueResult {
  isComplete: boolean;
  finalAnalysis?: SupportIntakeAnalysis;
  questions?: SupportIntakeQuestion[];
  canSkip?: boolean;
  round?: number;
  maxRounds?: number;
}

export interface SupportSubmitInput {
  sessionId: string;
  analysisSessionId: string;
  subject?: string;
  analysis?: unknown;
  pendingAttachmentIds?: string[];
}

export interface SupportTicketResult {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
}
