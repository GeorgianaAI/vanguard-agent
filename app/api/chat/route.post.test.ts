import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApprovalContextV1 } from "../../../src/lib/approval/types";
import { computeApprovalContextHash } from "../../../src/lib/approval/hash";

const TEST_APPROVAL_CONTEXT: ApprovalContextV1 = {
  version: 1,
  approval_id: "apr-test-1",
  thread_id: "v-test-1",
  requested_at: new Date(0).toISOString(),
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  requested_by_node: "scout",
  summary: "Need registrar metadata before corroboration.",
  risk_level: "low",
  side_effects: "read_only_public_data",
  policy_tags: ["public-data"],
  tool: {
    name: "domain_whois",
    args: { domain: "openai.com" },
    args_display: { domain: "openai.com" },
    arg_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  expected_output: ["registrar"],
  constraints: {
    allowed_tools: ["domain_whois", "tavily_search"],
    target_lock: "openai.com",
  },
  prior_approvals_in_thread: 0,
  changes_since_last: ["First authorization in this thread."],
};

let TEST_APPROVAL_CONTEXT_HASH =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";

const hoisted = vi.hoisted(() => ({
  redisSet: vi.fn(),
  ratelimitLimit: vi.fn().mockResolvedValue({ success: true }),
  getState: vi.fn(),
  updateState: vi.fn(),
  streamEvents: vi.fn(() =>
    (async function* () {
      yield { event: "test", data: {} };
    })(),
  ),
  createUI: vi.fn(
    () =>
      new Response(null, {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
  ),
  toUIStream: vi.fn(() =>
    (async function* () {
      yield undefined;
    })(),
  ),
}));

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({
      set: hoisted.redisSet,
    }),
  },
}));

vi.mock("@upstash/ratelimit", () => {
  class MockR {
    limit = hoisted.ratelimitLimit;
    constructor() {}
    static slidingWindow = vi.fn(() => ({}));
  }
  return { Ratelimit: MockR };
});

vi.mock("../../../src/lib/agent/graph", () => ({
  vanguardGraph: {
    getState: hoisted.getState,
    updateState: hoisted.updateState,
    streamEvents: hoisted.streamEvents,
  },
}));

vi.mock("ai", async (importOriginal) => {
  const mod = await importOriginal<typeof import("ai")>();
  return {
    ...mod,
    createUIMessageStreamResponse: hoisted.createUI,
  };
});

vi.mock("@ai-sdk/langchain", () => ({
  toUIMessageStream: hoisted.toUIStream,
}));

describe("POST /api/chat governance", () => {
  beforeEach(async () => {
    vi.resetModules();
    TEST_APPROVAL_CONTEXT_HASH = await computeApprovalContextHash(
      TEST_APPROVAL_CONTEXT,
    );
    TEST_APPROVAL_CONTEXT.approval_context_hash = TEST_APPROVAL_CONTEXT_HASH;
    hoisted.redisSet.mockReset();
    hoisted.ratelimitLimit.mockReset();
    hoisted.getState.mockReset();
    hoisted.updateState.mockReset();
    hoisted.streamEvents.mockReset();
    hoisted.createUI.mockClear();
    hoisted.ratelimitLimit.mockResolvedValue({ success: true });
    hoisted.redisSet.mockResolvedValue("OK");
    hoisted.getState.mockResolvedValue({
      values: {
        isPendingApproval: true,
        scoutHasRun: false,
        pendingApprovalContext: TEST_APPROVAL_CONTEXT,
        pendingApprovalHash: TEST_APPROVAL_CONTEXT_HASH,
        pendingApprovalId: TEST_APPROVAL_CONTEXT.approval_id,
        approvalHistory: [],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function loadPost() {
    const { POST } = await import("./route");
    return POST;
  }

  it("returns 409 when graph state is not awaiting approval", async () => {
    hoisted.getState.mockResolvedValue({
      values: { isPendingApproval: false, scoutHasRun: false },
    });
    const POST = await loadPost();
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isApproval: true,
          approved: true,
          thread_id: "v-test-1",
          tool_call_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_context_hash: TEST_APPROVAL_CONTEXT_HASH,
        }),
      }),
    );
    expect(res.status).toBe(409);
    const text = await res.text();
    expect(text).toContain("no pending authorization");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns 409 when Redis NX lock is not acquired", async () => {
    hoisted.redisSet.mockResolvedValue(null);
    const POST = await loadPost();
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isApproval: true,
          approved: true,
          thread_id: "v-test-2",
          tool_call_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_context_hash: TEST_APPROVAL_CONTEXT_HASH,
        }),
      }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 400 when approval payload omits approved boolean", async () => {
    const POST = await loadPost();
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isApproval: true,
          thread_id: "v-test-3",
          messages: [],
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect(hoisted.ratelimitLimit).not.toHaveBeenCalled();
  });

  it("returns 400 when approval payload omits context binding", async () => {
    const POST = await loadPost();
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isApproval: true,
          approved: true,
          thread_id: "v-test-3",
          tool_call_id: "x",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 on approval hash mismatch", async () => {
    const POST = await loadPost();
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isApproval: true,
          approved: true,
          thread_id: "v-test-1",
          tool_call_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_context_hash:
            "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        }),
      }),
    );
    expect(res.status).toBe(409);
  });

  it("accepts approval when checkpoint context is missing but body context is valid", async () => {
    hoisted.getState.mockResolvedValue({
      values: {
        isPendingApproval: true,
        scoutHasRun: false,
        approvalHistory: [],
      },
    });
    const POST = await loadPost();
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isApproval: true,
          approved: true,
          thread_id: "v-test-1",
          tool_call_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_context_hash: TEST_APPROVAL_CONTEXT_HASH,
          approval_context: TEST_APPROVAL_CONTEXT,
        }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 429 when rate limit fails", async () => {
    hoisted.ratelimitLimit.mockResolvedValue({ success: false });
    const POST = await loadPost();
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [],
          target: "example.com",
          thread_id: "v-rate",
        }),
      }),
    );
    expect(res.status).toBe(429);
  });

  it("returns 200 stream wrapper when approval succeeds", async () => {
    const POST = await loadPost();
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          isApproval: true,
          approved: true,
          thread_id: "v-test-1",
          tool_call_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_id: TEST_APPROVAL_CONTEXT.approval_id,
          approval_context_hash: TEST_APPROVAL_CONTEXT_HASH,
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(hoisted.updateState).toHaveBeenCalled();
    expect(hoisted.streamEvents).toHaveBeenCalled();
    expect(hoisted.createUI).toHaveBeenCalled();
  });
});
