import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/lib/runtime/healthProbes", () => ({
  probeRedis: vi.fn(),
  probeVector: vi.fn(),
  probeLangSmith: vi.fn(),
  sendHealthAlert: vi.fn().mockResolvedValue(undefined),
}));

async function loadProbes() {
  return import("../../../src/lib/runtime/healthProbes");
}

const originalEnv = { ...process.env };

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 200 with ok dependencies on successful probes", async () => {
    process.env.NODE_ENV = "test";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.UPSTASH_VECTOR_REST_URL = "https://vector";
    process.env.UPSTASH_VECTOR_REST_TOKEN = "token";
    process.env.LANGSMITH_API_KEY = "ls-key";
    process.env.LANGSMITH_PROJECT = "ls-project";

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeLangSmith).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const dependencies = body.dependencies as Record<string, string>;
    expect(body.status).toBe("ok");
    expect(dependencies.redis).toBe("ok");
    expect(dependencies.vector).toBe("ok");
    expect(dependencies.langsmith).toBe("ok");
  });

  it("returns 200 and degraded langsmith in non-production when missing config", async () => {
    process.env.NODE_ENV = "test";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.UPSTASH_VECTOR_REST_URL = "https://vector";
    process.env.UPSTASH_VECTOR_REST_TOKEN = "token";
    delete process.env.LANGSMITH_API_KEY;
    delete process.env.LANGSMITH_PROJECT;

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const dependencies = body.dependencies as Record<string, string>;
    expect(dependencies.redis).toBe("ok");
    expect(dependencies.vector).toBe("ok");
    expect(dependencies.langsmith).toBe("degraded");
  });

  it("returns 503 in production when critical probe fails", async () => {
    process.env.NODE_ENV = "production";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.UPSTASH_VECTOR_REST_URL = "https://vector";
    process.env.UPSTASH_VECTOR_REST_TOKEN = "token";
    process.env.LANGSMITH_API_KEY = "ls-key";
    process.env.LANGSMITH_PROJECT = "project";

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({
      state: "error",
      detail: "redis_probe_timeout",
    });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeLangSmith).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    const dependencies = body.dependencies as Record<string, string>;
    const details = body.details as Record<string, string>;
    expect(body.status).toBe("degraded");
    expect(dependencies.redis).toBe("error");
    expect(details.redis).toBe("redis_probe_timeout");
  });

  it("returns 503 in production when critical deps are missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_VECTOR_REST_URL;
    delete process.env.UPSTASH_VECTOR_REST_TOKEN;
    process.env.LANGSMITH_API_KEY = "ls-key";
    process.env.LANGSMITH_PROJECT = "project";

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    const dependencies = body.dependencies as Record<string, string>;
    expect(dependencies.redis).toBe("missing");
    expect(dependencies.vector).toBe("missing");
  });

  it("does not leak secret values in health response", async () => {
    process.env.NODE_ENV = "production";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "super-secret-redis-token";
    process.env.UPSTASH_VECTOR_REST_URL = "https://vector.example";
    process.env.UPSTASH_VECTOR_REST_TOKEN = "super-secret-vector-token";
    process.env.LANGSMITH_API_KEY = "super-secret-langsmith-key";
    process.env.LANGSMITH_PROJECT = "project";

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeLangSmith).mockResolvedValue({
      state: "error",
      detail: "langsmith_status_401",
    });

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/health"));
    const text = await res.text();
    expect(text).not.toContain("super-secret-redis-token");
    expect(text).not.toContain("super-secret-vector-token");
    expect(text).not.toContain("super-secret-langsmith-key");
  });

  it("resolves redis config with redteam mode enabled", async () => {
    process.env.NODE_ENV = "test";
    process.env.REDTEAM_MODE = "true";
    process.env.RED_TEAM_UPSTASH_REDIS_REST_URL = "https://redis-red";
    process.env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN = "red-token";
    process.env.RED_TEAM_UPSTASH_VECTOR_REST_URL = "https://vector-red";
    process.env.RED_TEAM_UPSTASH_VECTOR_REST_TOKEN = "red-token";

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    expect(vi.mocked(probes.probeRedis)).toHaveBeenCalledWith(
      "https://redis-red",
      "red-token",
    );
    expect(vi.mocked(probes.probeVector)).toHaveBeenCalledWith(
      "https://vector-red",
      "red-token",
    );
  });

  it("resolves default redis config with redteam mode disabled", async () => {
    process.env.NODE_ENV = "test";
    process.env.REDTEAM_MODE = "false";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis-default";
    process.env.UPSTASH_REDIS_REST_TOKEN = "default-token";
    process.env.UPSTASH_VECTOR_REST_URL = "https://vector-default";
    process.env.UPSTASH_VECTOR_REST_TOKEN = "default-token";

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    await GET(new Request("http://localhost/api/health"));
    expect(vi.mocked(probes.probeRedis)).toHaveBeenCalledWith(
      "https://redis-default",
      "default-token",
    );
  });
});
