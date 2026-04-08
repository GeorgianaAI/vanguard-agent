import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEnvTestHarness } from "@/tests/utils/envTestHarness";
import { makeTestRequest } from "@/tests/utils/httpTestRequest";

const hoisted = vi.hoisted(() => ({
  fetchRuns: vi.fn(),
}));

vi.mock("../../../../src/lib/audit/langsmith", () => ({
  fetchLangSmithRunsForThread: hoisted.fetchRuns,
}));

describe("GET /api/audit/evidence", () => {
  const { setEnv, unsetEnv } = useEnvTestHarness();

  beforeEach(() => {
    hoisted.fetchRuns.mockReset();
    hoisted.fetchRuns.mockResolvedValue([]);
    vi.clearAllMocks();
  });

  it("returns degraded evidence status when LangSmith config is missing in production", async () => {
    setEnv({ NODE_ENV: "production" });
    unsetEnv("LANGSMITH_API_KEY", "LANGSMITH_PROJECT");

    const { GET } = await import("./route");
    const res = await GET(
      makeTestRequest("/api/audit/evidence", { query: { thread_id: "t-1" } }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      evidence_status: string;
      warnings: string[];
    };
    expect(body.evidence_status).toBe("degraded");
    expect(body.warnings).toContain(
      "LangSmith is not configured in this non-development environment.",
    );
  });

  it("returns complete evidence status in development without LangSmith config", async () => {
    setEnv({ NODE_ENV: "development" });
    unsetEnv("LANGSMITH_API_KEY", "LANGSMITH_PROJECT");

    const { GET } = await import("./route");
    const res = await GET(
      makeTestRequest("/api/audit/evidence", { query: { thread_id: "t-2" } }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      evidence_status: string;
    };
    expect(body.evidence_status).toBe("complete");
  });
});
