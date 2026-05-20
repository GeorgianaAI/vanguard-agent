type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

type ApprovalContext = {
  version: number;
  approval_id: string;
  thread_id: string;
  requested_at: string;
  expires_at: string;
  requested_by_node: string;
  summary: string;
  risk_level: string;
  side_effects: string;
  policy_tags: string[];
  tool: {
    name: string;
    args: Record<string, unknown>;
    args_display: Record<string, unknown>;
    arg_hash: string;
  };
  expected_output: string[];
  constraints: {
    allowed_tools: string[];
    target_lock: string;
  };
  prior_approvals_in_thread: number;
  changes_since_last: string[];
};

type ApprovalPayload = {
  isApproval: boolean;
  approved: boolean;
  thread_id: string;
  tool_call_id: string;
  approval_id: string;
  approval_context_hash: string;
  approval_context: ApprovalContext;
};

const BASE_THREAD = "redteam-factory-00000001";
const DUMMY_HASH = "sha256:" + "a".repeat(64);

export function buildApprovalPayload(overrides: DeepPartial<ApprovalPayload> = {}): ApprovalPayload {
  const thread_id = (overrides.thread_id as string | undefined) ?? BASE_THREAD;
  const approval_id = (overrides.approval_id as string | undefined) ?? "apr-factory";

  const base: ApprovalPayload = {
    isApproval: true,
    approved: true,
    thread_id,
    tool_call_id: approval_id,
    approval_id,
    approval_context_hash: DUMMY_HASH,
    approval_context: {
      version: 1,
      approval_id,
      thread_id,
      requested_at: "2026-03-30T00:00:00.000Z",
      expires_at: "2099-01-01T00:00:00.000Z",
      requested_by_node: "scout",
      summary: "Factory approval context",
      risk_level: "low",
      side_effects: "read_only_public_data",
      policy_tags: ["public-data"],
      tool: {
        name: "domain_whois",
        args: { domain: "openai.com" },
        args_display: { domain: "openai.com" },
        arg_hash: DUMMY_HASH,
      },
      expected_output: ["registrar"],
      constraints: {
        allowed_tools: ["domain_whois", "tavily_search"],
        target_lock: "openai.com",
      },
      prior_approvals_in_thread: 0,
      changes_since_last: ["Factory approval"],
    },
  };

  return deepMerge(base, overrides) as ApprovalPayload;
}

function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source as object)) {
    const sv = (source as Record<string, unknown>)[key];
    const tv = (target as Record<string, unknown>)[key];
    if (sv !== null && typeof sv === "object" && !Array.isArray(sv) && typeof tv === "object") {
      result[key] = deepMerge(tv, sv as DeepPartial<typeof tv>);
    } else if (sv !== undefined) {
      result[key] = sv;
    }
  }
  return result as T;
}
