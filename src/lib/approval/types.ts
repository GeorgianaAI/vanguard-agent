export type ApprovalRiskLevel = "low" | "medium" | "high";

export type ApprovalSideEffects =
  | "read_only_public_data"
  | "read_only_network_query"
  | "execution_high_risk";

export type ApprovalToolPlan = {
  name: string;
  args: Record<string, unknown>;
  args_display: Record<string, string>;
  arg_hash: string;
};

export type ApprovalContextV1 = {
  version: 1;
  approval_id: string;
  approval_context_hash?: string;
  thread_id: string;
  requested_at: string;
  expires_at: string;
  requested_by_node: "supervisor" | "scout" | "system";
  summary: string;
  reasoning_excerpt?: string;
  risk_level: ApprovalRiskLevel;
  side_effects: ApprovalSideEffects;
  policy_tags: string[];
  budget?: {
    estimated_tokens?: number;
    max_tokens_for_step?: number;
  };
  tool: ApprovalToolPlan;
  expected_output: string[];
  constraints: {
    allowed_tools: string[];
    target_lock: string;
  };
  prior_approvals_in_thread: number;
  changes_since_last: string[];
};

export type ApprovalDecision = {
  version: 1;
  approval_id: string;
  thread_id: string;
  decided_at: string;
  decision: "authorized" | "aborted";
  tool_name: string;
  tool_arg_hash: string;
  request_id?: string;
};
