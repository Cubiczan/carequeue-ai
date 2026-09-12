export type UserRole = "finance" | "operations";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalQueueName = "finance" | "operations";

export type AgentSystem =
  | "capital_reflex"
  | "revenue_velocity"
  | "inventory_intelligence"
  | "customer_lifetime"
  | "operational_health";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  system: AgentSystem;
  queue: ApprovalQueueName;
  is_active: boolean;
  autonomous_limit: number | null;
  approval_required_above: number | null;
}

export interface ApprovalItem {
  id: string;
  agent_id: string;
  agent_name: string;
  queue: ApprovalQueueName;
  action_description: string;
  financial_impact: string;
  impact_amount: number | null;
  status: ApprovalStatus;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  slack_notified: boolean;
}

export interface AgentActionLogEntry {
  id: string;
  timestamp: string;
  agent_name: string;
  queue: ApprovalQueueName;
  action_type: string;
  description: string;
  outcome: string;
  decided_by: string;
  reasoning_summary: string;
  approval_item_id: string | null;
}

export interface ActivityHistoryEntry {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_display_name: string;
  user_email: string;
  user_role: UserRole;
  activity_type: string;
  description: string;
  contextual_reference: string | null;
}
