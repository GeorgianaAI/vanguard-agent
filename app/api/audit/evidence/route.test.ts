import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  fetchRuns: vi.fn(),
}));

vi.mock("../../../../src/lib/audit/langsmith", () => ({
  fetchLangSmithRunsForThread: hoisted.fetchRuns,
}));

describe("GET /api/audit/evidence", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    hoisted.fetchRuns.mockReset();
    hoisted.fetchRuns.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it("returns degraded evidence status when LangSmith config is missing in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.LANGSMITH_API_KEY;
    delete process.env.LANGSMITH_PROJECT;

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/audit/evidence?thread_id=t-1"),
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
    process.env.NODE_ENV = "development";
    delete process.env.LANGSMITH_API_KEY;
    delete process.env.LANGSMITH_PROJECT;

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/audit/evidence?thread_id=t-2"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      evidence_status: string;
    };
    expect(body.evidence_status).toBe("complete");
  });
});
