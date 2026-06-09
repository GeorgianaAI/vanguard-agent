import { describe, expect, it } from "vitest";

import type { GovernanceViewModel } from "@/app/governance/lib/buildGovernanceViewModel";

import { renderGovernanceCompliancePdf } from "./renderGovernancePdf";

function minimalModel(over: Partial<GovernanceViewModel> = {}): GovernanceViewModel {
  return {
    source: "derived",
    ledgerRows: [
      {
        time: "12:00",
        agent: "SCOUT",
        action: "Test",
        status: "OK",
        risk: "Low",
      },
    ],
    advisorySignals: [],
    advisoryOverflowCount: 0,
    evidenceTrail: [{ label: "L", desc: "D", id: "GOV-1" }],
    nistMeasure: {
      mode: "M",
      label: "L",
      value: "1%",
      percent: 50,
    },
    nistManage: {
      mode: "M2",
      label: "L2",
      value: "X",
      percent: 60,
    },
    threadId: "vanguard-thread-x",
    missionId: "mission-1",
    requestId: "req-1",
    evidenceStatus: "complete",
    evidenceWarnings: [],
    advisoryEnrichmentWarnings: [],
    faithfulnessWarnings: [],
    ...over,
  };
}

describe("renderGovernanceCompliancePdf", () => {
  it("produces non-trivial PDF bytes for a full model", async () => {
    const bytes = await renderGovernanceCompliancePdf({
      generatedAtIso: "2026-01-01T00:00:00.000Z",
      model: minimalModel(),
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("remains valid with degraded warnings and empty advisories", async () => {
    const bytes = await renderGovernanceCompliancePdf({
      generatedAtIso: "2026-01-01T00:00:00.000Z",
      model: minimalModel({
        evidenceStatus: "degraded",
        evidenceWarnings: ["LangSmith unavailable in test"],
        advisoryEnrichmentWarnings: ["ADVISORY_BUDGET_EXHAUSTED"],
        advisorySignals: [],
      }),
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
  });
});
