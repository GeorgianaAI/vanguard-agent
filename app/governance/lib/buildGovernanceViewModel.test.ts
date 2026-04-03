import { describe, expect, it } from "vitest";
import type { DashboardMessage } from "@/app/dashboard/lib/types";
import type { EvidencePackage } from "@/src/lib/audit/evidence";

import { buildGovernanceViewModelFromData } from "./buildGovernanceViewModel";

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
  riskLevel: "low" | "medium" | "high";
  toolName: string;
}): string {
  const payload = {
    version: 1,
    approval_id: "apr-1",
    thread_id: "thread-1",
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

function evidencePackage(
  status: "complete" | "degraded",
  traceCount: number,
  warnings: string[] = [],
): EvidencePackage {
  return {
    version: 1,
    evidence_status: status,
    mission_id: "mission-1",
    thread_id: "thread-1",
    request_id: "req-1",
    generated_at: "2026-01-01T00:00:00.000Z",
    trace_correlation: {
      mission_id: "mission-1",
      thread_id: "thread-1",
      request_id: "req-1",
    },
    traces: Array.from({ length: traceCount }).map((_, i) => ({
      run_id: `run-${i + 1}`,
      name: "scout_node",
      type: "llm",
      status: "ok",
      started_at: "2026-01-01T00:00:00.000Z",
      ended_at: "2026-01-01T00:00:01.000Z",
      metadata: {},
    })),
    warnings,
  };
}

describe("buildGovernanceViewModelFromData", () => {
  it("returns mock fallback when transcript is missing", () => {
    const vm = buildGovernanceViewModelFromData([], null);
    expect(vm.source).toBe("mock");
    expect(vm.ledgerRows).toHaveLength(3);
    expect(vm.advisorySignals).toHaveLength(2);
    expect(vm.evidenceTrail).toHaveLength(3);
  });

  it("returns mock fallback when approval context is absent", () => {
    const vm = buildGovernanceViewModelFromData(
      [assistant("No approval payload here."), user("Mission authorized")],
      null,
    );
    expect(vm.source).toBe("mock");
    expect(vm.advisorySignals).toHaveLength(2);
  });

  it("derives evidence + nist cards for authorized flow", () => {
    const messages: DashboardMessage[] = [
      assistant(approvalPayload({ riskLevel: "low", toolName: "tavily_search" })),
      user("Mission authorized"),
      assistant("Final auditor summary.", { agent_node: "auditor" }),
    ];
    const vm = buildGovernanceViewModelFromData(
      messages,
      evidencePackage("complete", 2),
    );

    expect(vm.source).toBe("derived");
    expect(vm.ledgerRows[1]?.status).toBe("Policy Match");
    expect(vm.advisorySignals.length).toBeGreaterThan(0);
    expect(vm.advisorySignals[0]?.id.startsWith("ADV-")).toBe(true);
    expect(vm.evidenceTrail[1]?.desc.toLowerCase()).toContain("authorized");
    expect(vm.nistMeasure.value).toMatch(/%/);
    expect(vm.nistManage.value).toBe("AUTHORIZED");
    expect(vm.nistMeasure.percent).toBeGreaterThan(0);
    expect(vm.nistManage.percent).toBeGreaterThan(0);
  });

  it("derives evidence + nist cards for aborted flow", () => {
    const messages: DashboardMessage[] = [
      assistant(approvalPayload({ riskLevel: "medium", toolName: "domain_whois" })),
      user("Mission aborted"),
      assistant("Aborted closure.", { agent_node: "auditor" }),
    ];
    const vm = buildGovernanceViewModelFromData(
      messages,
      evidencePackage("degraded", 0, ["No traces"]),
    );

    expect(vm.source).toBe("derived");
    expect(vm.ledgerRows[1]?.status).toBe("Policy Mismatch");
    expect(vm.evidenceTrail[1]?.desc.toLowerCase()).toContain("aborted");
    expect(vm.nistManage.value).toBe("ABORTED");
    expect(vm.nistMeasure.mode).toBe("TEVV-DEGRADED");
    expect(vm.nistMeasure.percent).toBeGreaterThanOrEqual(0);
  });

  it("penalizes measure score when warnings increase", () => {
    const messages: DashboardMessage[] = [
      assistant(approvalPayload({ riskLevel: "low", toolName: "tavily_search" })),
      user("Mission authorized"),
      assistant("Final auditor summary.", { agent_node: "auditor" }),
    ];

    const withoutWarnings = buildGovernanceViewModelFromData(
      messages,
      evidencePackage("complete", 2, []),
    );
    const withWarnings = buildGovernanceViewModelFromData(
      messages,
      evidencePackage("complete", 2, ["w1", "w2"]),
    );

    expect(withWarnings.nistMeasure.percent).toBeLessThan(
      withoutWarnings.nistMeasure.percent,
    );
  });

  it("penalizes measure score when traces are missing", () => {
    const messages: DashboardMessage[] = [
      assistant(approvalPayload({ riskLevel: "low", toolName: "domain_whois" })),
      user("Mission authorized"),
      assistant("Final auditor summary.", { agent_node: "auditor" }),
    ];

    const withTraces = buildGovernanceViewModelFromData(
      messages,
      evidencePackage("complete", 2, []),
    );
    const withoutTraces = buildGovernanceViewModelFromData(
      messages,
      evidencePackage("complete", 0, []),
    );

    expect(withoutTraces.nistMeasure.percent).toBeLessThan(
      withTraces.nistMeasure.percent,
    );
  });
});

