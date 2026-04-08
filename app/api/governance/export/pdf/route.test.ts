import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeTestRequest } from "@/tests/utils/httpTestRequest";
import { buildGovernanceViewModelFromData } from "@/app/governance/lib/buildGovernanceViewModel";

const hoisted = vi.hoisted(() => ({
  loadGovernanceSnapshotForThread: vi.fn(),
}));

vi.mock("@/src/lib/governance/loadGovernanceSnapshot", () => ({
  loadGovernanceSnapshotForThread: hoisted.loadGovernanceSnapshotForThread,
}));

describe("GET /api/governance/export/pdf", () => {
  beforeEach(() => {
    hoisted.loadGovernanceSnapshotForThread.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without x-actor-id", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      makeTestRequest("/api/governance/export/pdf", {
        query: { thread_id: "vanguard-thread-pdf" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when thread_id is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      makeTestRequest("/api/governance/export/pdf", {
        headers: { "x-actor-id": "analyst-1" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 application/pdf with non-empty body when snapshot loads", async () => {
    const model = buildGovernanceViewModelFromData([], null, undefined, {
      threadId: "vanguard-thread-pdf",
    });
    hoisted.loadGovernanceSnapshotForThread.mockResolvedValue({
      ok: true,
      model,
    });

    const { GET } = await import("./route");
    const res = await GET(
      makeTestRequest("/api/governance/export/pdf", {
        query: { thread_id: "vanguard-thread-pdf" },
        headers: { "x-actor-id": "analyst-1" },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("returns 400 when snapshot reports invalid_thread", async () => {
    hoisted.loadGovernanceSnapshotForThread.mockResolvedValue({
      ok: false,
      reason: "invalid_thread",
    });

    const { GET } = await import("./route");
    const res = await GET(
      makeTestRequest("/api/governance/export/pdf", {
        query: { thread_id: "bad-prefix" },
        headers: { "x-actor-id": "analyst-1" },
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/invalid/i);
  });

  it("returns 404 when snapshot reports no_checkpoint", async () => {
    hoisted.loadGovernanceSnapshotForThread.mockResolvedValue({
      ok: false,
      reason: "no_checkpoint",
    });

    const { GET } = await import("./route");
    const res = await GET(
      makeTestRequest("/api/governance/export/pdf", {
        query: { thread_id: "vanguard-thread-missing" },
        headers: { "x-actor-id": "analyst-1" },
      }),
    );

    expect(res.status).toBe(404);
  });
});
