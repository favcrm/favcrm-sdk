/**
 * Assistant LLM usage rollups. The `groupBy=agent` variant of
 * `/v6/workspace-ai/settings/ai/credits/usage-summary` returns an array
 * of these rows; the default (no groupBy) returns the aggregate shape.
 *
 * Backed by `assistant_usage_records` in D1.
 */

export interface AssistantUsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalProviderUsd: number;
  totalChargedUsd: number;
  totalCreditsDebited: number;
  requestCount: number;
}

export interface AssistantUsageAgentBreakdownRow {
  /** Null for ambient flows (scanner, document intake) that don't attribute. */
  agentId: string | null;
  agentName: string | null;
  agentEmoji: string | null;
  inputTokens: number;
  outputTokens: number;
  providerUsd: number;
  chargedUsd: number;
  creditsDebited: number;
  requestCount: number;
}
