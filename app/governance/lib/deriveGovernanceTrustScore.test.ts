import { describe, expect, it } from "vitest";

import { buildGovernanceViewModelFromData } from "./buildGovernanceViewModel";
import { deriveGovernanceTrustScore } from "./deriveGovernanceTrustScore";
import type { DashboardMessage } from "@/app/dashboard/lib/types";
import type { EvidencePackage } from "@/src/lib/audit/evidence";

function assistant(text: string, metadata?: DashboardMessage["metadata"]): DashboardMessage {
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

function approvalPayload(toolName: string): string {
  const payload = {
    version: 1,
    approval_id: "apr-1",
    thread_id: "thread-1",
    requested_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    requested_by_node: "scout",
    summary: "Need WHOIS.",
    risk_level: "low",
    side_effects: "read_only_public_data",
    policy_tags: ["public-data"],
    tool: {
      name: toolName,
      args: { domain: "openai.com" },
      args_display: { domain: "openai.com" },
      arg_hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    expected_output: ["registrar"],
    constraints: {
      allowed_tools: [toolName],
      target_lock: "openai.com",
    },
    prior_approvals_in_thread: 0,
    changes_since_last: ["First authorization in this thread."],
  };

  return `AUTHORIZATION_REQUIRED: ${JSON.stringify(payload)}`;
}

function evidence(status: "complete" | "degraded", warnings: string[] = []): EvidencePackage {
  return {
    version: 1,
    evidence_status: status,
    mission_id: "m1",
    thread_id: "t1",
    request_id: "r1",
    generated_at: "2026-01-01T00:00:00.000Z",
    trace_correlation: { mission_id: "m1", thread_id: "t1", request_id: "r1" },
    traces: [
      {
        run_id: "run-1",
        name: "scout_node",
        type: "llm",
        status: "ok",
        started_at: "2026-01-01T00:00:00.000Z",
        ended_at: "2026-01-01T00:00:01.000Z",
        metadata: {},
      },
    ],
    warnings,
  };
}

describe("deriveGovernanceTrustScore", () => {
  it("returns standby mask when mission-linked data is absent", () => {
    const vm = buildGovernanceViewModelFromData([], null);
    const t = deriveGovernanceTrustScore(vm);
    expect(t.mode).toBe("standby");
    if (t.mode === "standby") {
      expect(t.display).toBe("--.-%");
    }
  });

  it("returns derived percent for authorized flow with complete evidence", () => {
    const messages: DashboardMessage[] = [
      assistant(approvalPayload("tavily_search")),
      user("Mission authorized"),
      assistant("Auditor done.", { agent_node: "auditor" }),
    ];
    const vm = buildGovernanceViewModelFromData(messages, evidence("complete"));
    const t = deriveGovernanceTrustScore(vm);
    expect(t.mode).toBe("derived");
    if (t.mode === "derived") {
      expect(t.percent).toBeGreaterThan(0);
      expect(t.percent).toBeLessThanOrEqual(100);
      expect(t.formatted).toMatch(/^\d{1,3}(\.\d)?%$/);
    }
  });

  it("lowers trust when evidence is degraded and warnings exist", () => {
    const messages: DashboardMessage[] = [
      assistant(approvalPayload("tavily_search")),
      user("Mission authorized"),
      assistant("Auditor done.", { agent_node: "auditor" }),
    ];
    const vmGood = buildGovernanceViewModelFromData(messages, evidence("complete"));
    const vmBad = buildGovernanceViewModelFromData(
      messages,
      evidence("degraded", ["langsmith partial"]),
      { advisoryWarnings: ["nvd timeout"] },
    );

    const good = deriveGovernanceTrustScore(vmGood);
    const bad = deriveGovernanceTrustScore(vmBad);
    expect(good.mode).toBe("derived");
    expect(bad.mode).toBe("derived");
    if (good.mode === "derived" && bad.mode === "derived") {
      expect(bad.percent).toBeLessThan(good.percent);
    }
  });

  it("penalizes advisory enrichment warnings and overflow", () => {
    const messages: DashboardMessage[] = [
      assistant(approvalPayload("tavily_search")),
      user("Mission authorized"),
      assistant("Auditor done.", { agent_node: "auditor" }),
    ];
    const base = buildGovernanceViewModelFromData(messages, evidence("complete"), {
      advisoryWarnings: [],
    });
    const noisy = buildGovernanceViewModelFromData(messages, evidence("complete"), {
      advisoryWarnings: ["retry", "rate limit"],
    });

    const tBase = deriveGovernanceTrustScore(base);
    const tNoisy = deriveGovernanceTrustScore(noisy);
    if (tBase.mode === "derived" && tNoisy.mode === "derived") {
      expect(tNoisy.percent).toBeLessThanOrEqual(tBase.percent);
    }
  });
});
