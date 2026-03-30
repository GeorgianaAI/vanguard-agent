import { describe, expect, it } from "vitest";
import { buildEvidencePackage } from "./evidence";

describe("buildEvidencePackage", () => {
  it("maps runs and injects correlation metadata", () => {
    const pkg = buildEvidencePackage({
      missionId: "mission-1",
      threadId: "thread-1",
      requestId: "req-1",
      generatedAt: "2026-03-30T00:00:00.000Z",
      runs: [
        {
          id: "run-1",
          name: "vanguard-agent-recon",
          run_type: "chain",
          start_time: "2026-03-30T00:00:01.000Z",
          end_time: "2026-03-30T00:00:02.000Z",
          extra: { metadata: { stage: "recon" } },
        },
      ],
    });

    expect(pkg.version).toBe(1);
    expect(pkg.evidence_status).toBe("complete");
    expect(pkg.trace_correlation.thread_id).toBe("thread-1");
    expect(pkg.traces[0].metadata.request_id).toBe("req-1");
    expect(pkg.traces[0].metadata.stage).toBe("recon");
    expect(pkg.traces[0].status).toBe("ok");
  });

  it("marks trace status error when run has error", () => {
    const pkg = buildEvidencePackage({
      missionId: "mission-1",
      threadId: "thread-1",
      requestId: "req-1",
      generatedAt: "2026-03-30T00:00:00.000Z",
      runs: [{ id: "run-err", error: "boom" }],
    });
    expect(pkg.traces[0].status).toBe("error");
  });

  it("supports degraded evidence status", () => {
    const pkg = buildEvidencePackage({
      missionId: "mission-1",
      threadId: "thread-1",
      requestId: "req-1",
      generatedAt: "2026-03-30T00:00:00.000Z",
      runs: [],
      evidenceStatus: "degraded",
      warnings: ["LangSmith is not configured."],
    });
    expect(pkg.evidence_status).toBe("degraded");
    expect(pkg.warnings).toContain("LangSmith is not configured.");
  });
});
