import { describe, expect, it } from "vitest";
import type { DashboardMessage } from "@/app/dashboard/lib/types";
import type { EvidencePackage } from "@/src/lib/audit/evidence";

import { buildGovernanceViewModelFromData } from "./buildGovernanceViewModel";

function approvalPayload(toolName: string): string {
  const payload = {
    version: 1,
    approval_id: "apr-1",
    thread_id: "thread-1",
    requested_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    requested_by_node: "scout",
    summary: "x",
    risk_level: "low",
    side_effects: "read_only_public_data",
    policy_tags: ["public-data"],
    tool: {
      name: toolName,
      args: { domain: "x.com" },
      args_display: { domain: "x.com" },
      arg_hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    expected_output: ["registrar"],
    constraints: {
      allowed_tools: [toolName],
      target_lock: "x.com",
    },
    prior_approvals_in_thread: 0,
    changes_since_last: ["First authorization in this thread."],
  };
  return `AUTHORIZATION_REQUIRED: ${JSON.stringify(payload)}`;
}

function evidencePkg(
  status: "complete" | "degraded",
  warnings: string[],
): EvidencePackage {
  return {
    version: 1,
    evidence_status: status,
    mission_id: "m1",
    thread_id: "t1",
    request_id: "r1",
    generated_at: "2026-01-01T00:00:00.000Z",
    trace_correlation: { mission_id: "m1", thread_id: "t1", request_id: "r1" },
    traces: [],
    warnings,
  };
}

describe("governance ↔ evidence parity", () => {
  it("mirrors evidence warnings and status on the view model", () => {
    const messages: DashboardMessage[] = [
      {
        id: "a",
        role: "assistant",
        parts: [{ type: "text", text: approvalPayload("tavily_search") }],
      } as DashboardMessage,
      {
        id: "u",
        role: "user",
        parts: [{ type: "text", text: "Mission authorized" }],
      } as DashboardMessage,
      {
        id: "aud",
        role: "assistant",
        parts: [{ type: "text", text: "Done." }],
        metadata: { agent_node: "auditor" },
      } as DashboardMessage,
    ];

    const ev = evidencePkg("degraded", ["w1", "w2"]);
    const vm = buildGovernanceViewModelFromData(messages, ev, {
      advisoryWarnings: ["ADVISORY_BUDGET_EXHAUSTED"],
    });

    expect(vm.evidenceStatus).toBe("degraded");
    expect(vm.evidenceWarnings).toEqual(["w1", "w2"]);
    expect(vm.advisoryEnrichmentWarnings).toEqual(["ADVISORY_BUDGET_EXHAUSTED"]);
    expect(vm.missionId).toBe("m1");
    expect(vm.requestId).toBe("r1");
    expect(vm.evidenceTrail.some((e) => e.id === "GOV-ADV-PIPE")).toBe(true);
  });

  it("lowers NIST measure when evidence has more warnings (fixed messages)", () => {
    const messages: DashboardMessage[] = [
      {
        id: "a",
        role: "assistant",
        parts: [{ type: "text", text: approvalPayload("domain_whois") }],
      } as DashboardMessage,
      {
        id: "u",
        role: "user",
        parts: [{ type: "text", text: "Mission authorized" }],
      } as DashboardMessage,
      {
        id: "aud",
        role: "assistant",
        parts: [{ type: "text", text: "Done." }],
        metadata: { agent_node: "auditor" },
      } as DashboardMessage,
    ];

    const clean = buildGovernanceViewModelFromData(
      messages,
      evidencePkg("complete", []),
    );
    const noisy = buildGovernanceViewModelFromData(
      messages,
      evidencePkg("complete", ["a", "b", "c"]),
    );

    expect(noisy.nistMeasure.percent).toBeLessThan(clean.nistMeasure.percent);
  });
});
