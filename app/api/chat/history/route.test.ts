import { AIMessage } from "@langchain/core/messages";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";
import { attachAgentNode } from "@/src/lib/agent/agentNode";

vi.mock("@/src/lib/agent/graph", () => ({
  vanguardGraph: {
    getState: vi.fn(),
  },
}));

vi.mock("@/src/lib/runtime/redteam", () => ({
  getThreadPrefix: () => "vanguard-thread",
}));

import { vanguardGraph } from "@/src/lib/agent/graph";

describe("GET /api/chat/history", () => {
  const getState = vanguardGraph.getState as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getState.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without actor", async () => {
    const res = await GET(
      new Request("http://localhost/api/chat/history?thread_id=vanguard-thread-x"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for bad thread prefix", async () => {
    const res = await GET(
      new Request("http://localhost/api/chat/history?thread_id=other-x", {
        headers: { "x-actor-id": "alice" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns UI messages from checkpoint", async () => {
    getState.mockResolvedValue({
      values: {
        messages: [attachAgentNode(new AIMessage("done"), "auditor")],
      },
    });
    const res = await GET(
      new Request(
        "http://localhost/api/chat/history?thread_id=vanguard-thread-abc",
        { headers: { "x-actor-id": "alice" } },
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      messages: unknown[];
      vulnerabilities?: unknown;
      advisory_enrichment_warnings?: string[];
    };
    expect(body.messages).toHaveLength(1);
    expect(
      (body.messages[0] as { metadata?: { agent_node?: string } }).metadata
        ?.agent_node,
    ).toBe("auditor");
    expect(body.vulnerabilities).toBeUndefined();
    expect(body.advisory_enrichment_warnings).toBeUndefined();
  });

  it("returns checkpoint vulnerabilities and advisory warnings when present", async () => {
    getState.mockResolvedValue({
      values: {
        messages: [attachAgentNode(new AIMessage("done"), "auditor")],
        vulnerabilities: [{ cveId: "CVE-2024-1234", schemaVersion: 1 }],
        advisoryEnrichmentWarnings: ["ADVISORY_BUDGET_EXHAUSTED"],
      },
    });
    const res = await GET(
      new Request(
        "http://localhost/api/chat/history?thread_id=vanguard-thread-abc",
        { headers: { "x-actor-id": "alice" } },
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      vulnerabilities: unknown[];
      advisory_enrichment_warnings: string[];
    };
    expect(body.vulnerabilities).toHaveLength(1);
    expect(body.advisory_enrichment_warnings).toEqual([
      "ADVISORY_BUDGET_EXHAUSTED",
    ]);
  });

  it("returns empty array when getState throws", async () => {
    getState.mockRejectedValue(new Error("no checkpoint"));
    const res = await GET(
      new Request(
        "http://localhost/api/chat/history?thread_id=vanguard-thread-abc",
        { headers: { "x-actor-id": "alice" } },
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { messages: unknown[] };
    expect(body.messages).toEqual([]);
  });
});
