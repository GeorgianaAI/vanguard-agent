import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    hoisted.redisSet.mockReset();
    hoisted.ratelimitLimit.mockReset();
    hoisted.getState.mockReset();
    hoisted.updateState.mockReset();
    hoisted.streamEvents.mockReset();
    hoisted.createUI.mockClear();
    hoisted.ratelimitLimit.mockResolvedValue({ success: true });
    hoisted.redisSet.mockResolvedValue("OK");
    hoisted.getState.mockResolvedValue({
      values: { isPendingApproval: true, scoutHasRun: false },
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
          tool_call_id: "tool-1",
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
          tool_call_id: "tool-2",
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
          thread_id: "v-test-ok",
          tool_call_id: "tool-ok",
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(hoisted.updateState).toHaveBeenCalled();
    expect(hoisted.streamEvents).toHaveBeenCalled();
    expect(hoisted.createUI).toHaveBeenCalled();
  });
});
