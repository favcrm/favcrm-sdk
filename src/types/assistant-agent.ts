/**
 * AI employee ("assistant agent") types — shared between the WorkSpace AI
 * mobile client and the v2 merchant-portal so the two stay in lockstep.
 *
 * Mirrors the row shape of `assistant_agents` and `assistant_agent_templates`
 * in the API D1 schema. See `v2/api/packages/db/src/schema/assistant-agent.ts`
 * and `assistant-agent-template.ts` for the source of truth.
 */

export type AssistantAgentStatus = "active" | "paused" | "archived";
export type AssistantAgentRole = "manager" | "collaborator";

export interface AssistantAgentCapabilities {
  chat: boolean;
  proactive: boolean;
  scheduled: boolean;
  handoff: boolean;
  autonomous: boolean;
}

export interface AssistantAgent {
  id: string;
  companyId: string;
  name: string;
  emoji: string | null;
  personaPrompt: string | null;
  identityProfile: string | null;
  userProfile: string | null;
  toolsProfile: string | null;
  /** Wake message dispatched; runtime may not yet be responsive. */
  bootstrappedAt: string | null;
  /** Sidecar confirmed the agent answered the bootstrap probe. */
  readyAt?: string | null;
  modelId: string | null;
  capabilities: AssistantAgentCapabilities;
  channels: string[];
  isAutonomous: boolean;
  status: AssistantAgentStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AssistantAgentWithRole = AssistantAgent & {
  myRole: AssistantAgentRole;
};

export interface CreateAgentInput {
  name?: string;
  emoji?: string;
  personaPrompt?: string;
  identityProfile?: string;
  userProfile?: string;
  toolsProfile?: string;
  modelId?: string;
  capabilities?: Partial<AssistantAgentCapabilities>;
  channels?: string[];
  isAutonomous?: boolean;
  /** Slug of an `assistant_agent_templates` row to clone from. */
  fromTemplate?: string;
}

export type BootstrapStatus = "sent" | "already" | "not-ready" | "failed";

export interface BootstrapResult {
  status: BootstrapStatus;
  reason?: string;
}

export interface AssistantAgentTemplate {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  role: string;
  description: string;
  tagline: string | null;
  capabilities: AssistantAgentCapabilities;
  channels: string[];
  tools: string[];
  soulPromptMd: string;
  defaultModelId: string | null;
  industries: string[] | null;
  isAutonomous: boolean;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
