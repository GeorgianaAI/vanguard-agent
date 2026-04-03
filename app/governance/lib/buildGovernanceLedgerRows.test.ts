import { describe, expect, it } from "vitest";
import type { DashboardMessage } from "@/app/dashboard/lib/types";

import { buildGovernanceLedgerRowsFromMessages } from "./buildGovernanceLedgerRows";

function assistant(
  text: string,
  metadata?: DashboardMessage["metadata"],
): DashboardMessage {
  return {
    id: "a",
    role: "assistant",
    parts: [{ type: "text", text }],
    metadata,
  } as DashboardMessage;
}

function user(text: string): DashboardMessage {
  return {
    id: "u",
    role: "user",
    parts: [{ type: "text", text }],
  } as DashboardMessage;
}

function approvalPayload(params: {
  approvalId?: string;
  threadId?: string;
  riskLevel: "low" | "medium" | "high";
  toolName: string;
}): string {
  const approval_id = params.approvalId ?? "apr-1";
  const thread_id = params.threadId ?? "thread-1";

  const payload = {
    version: 1,
    approval_id,
    thread_id,
    requested_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    requested_by_node: "scout",
    summary: "Need WHOIS.",
    risk_level: params.riskLevel,
    side_effects: "read_only_public_data",
    policy_tags: ["public-data"],
    tool: {
      name: params.toolName,
      args: { domain: "openai.com" },
      args_display: { domain: "openai.com" },
      arg_hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    expected_output: ["registrar"],
    constraints: {
      allowed_tools: [params.toolName],
      target_lock: "openai.com",
    },
    prior_approvals_in_thread: 0,
    changes_since_last: ["First authorization in this thread."],
  };

  return `AUTHORIZATION_REQUIRED: ${JSON.stringify(payload)}`;
}

describe("buildGovernanceLedgerRowsFromMessages (A) approval events + risk first", () => {
  it("maps authorized transcript (low risk) to SCOUT/SUPERVISOR/AUDITOR statuses", () => {
    const messages: DashboardMessage[] = [
      assistant(approvalPayload({ riskLevel: "low", toolName: "domain_whois" })),
      user("Mission authorized"),
      assistant("Final auditor summary.", { agent_node: "auditor" }),
    ];

    const rows = buildGovernanceLedgerRowsFromMessages(messages);

    expect(rows).toHaveLength(3);
    expect(rows[0].agent).toBe("SCOUT");
    expect(rows[0].risk).toBe("Low");
    expect(rows[0].status).toBe("Authorized");
    expect(rows[0].action).toBe("WHOIS Lookup");

    expect(rows[1].agent).toBe("SUPERVISOR");
    expect(rows[1].risk).toBe("Low");
    expect(rows[1].status).toBe("Policy Match");

    expect(rows[2].agent).toBe("AUDITOR");
    expect(rows[2].risk).toBe("Low");
    expect(rows[2].status).toBe("Verified");
  });

  it('maps aborted transcript (medium risk) to SUPERVISOR "Policy Mismatch"', () => {
    const messages: DashboardMessage[] = [
      assistant(
        approvalPayload({ riskLevel: "medium", toolName: "tavily_search" }),
      ),
      user("Mission aborted"),
      assistant("Aborted: no tool results.", { agent_node: "auditor" }),
    ];

    const rows = buildGovernanceLedgerRowsFromMessages(messages);

    expect(rows[0].risk).toBe("Neutral");
    expect(rows[0].action).toBe("Tavily Search");
    expect(rows[1].status).toBe("Policy Mismatch");
    expect(rows[2].status).toBe("Unverified");
  });

  it("maps high risk to High", () => {
    const messages: DashboardMessage[] = [
      assistant(approvalPayload({ riskLevel: "high", toolName: "domain_whois" })),
      user("Mission authorized"),
      assistant("Final auditor summary.", { agent_node: "auditor" }),
    ];

    const rows = buildGovernanceLedgerRowsFromMessages(messages);
    expect(rows[0].risk).toBe("High");
  });
});

