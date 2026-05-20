/**
 * Per-channel routing of inbound conversations to a specific AI agent.
 * Mirrors `agent_channel_bindings` in the API D1 schema. One agent per
 * (companyId, channel); the unique index on the DB enforces this.
 */

export type AgentReplyPolicy = "auto" | "suggest" | "off";
export type AgentActiveHours = "always" | "business_hours" | "after_hours";
export type AgentBindingChannel =
  | "whatsapp"
  | "email"
  | "sms"
  | "instagram"
  | "messenger";

export interface AgentChannelBinding {
  id: string;
  companyId: string;
  channel: AgentBindingChannel;
  agentId: string;
  replyPolicy: AgentReplyPolicy;
  activeHours: AgentActiveHours;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAgentChannelBindingInput {
  channel: AgentBindingChannel;
  agentId: string;
  replyPolicy?: AgentReplyPolicy;
  activeHours?: AgentActiveHours;
  enabled?: boolean;
}
