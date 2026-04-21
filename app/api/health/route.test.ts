import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEnvTestHarness } from "@/tests/utils/envTestHarness";
import { makeTestRequest } from "@/tests/utils/httpTestRequest";

vi.mock("../../../src/lib/runtime/healthProbes", () => ({
  probeRedis: vi.fn(),
  probeVector: vi.fn(),
  probeLangSmith: vi.fn(),
  sendHealthAlert: vi.fn().mockResolvedValue(undefined),
}));

async function loadProbes() {
  return import("../../../src/lib/runtime/healthProbes");
}

describe("GET /api/health", () => {
  const { setEnv, unsetEnv } = useEnvTestHarness();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with ok dependencies on successful probes", async () => {
    setEnv({
      NODE_ENV: "test",
      UPSTASH_REDIS_REST_URL: "https://redis",
      UPSTASH_REDIS_REST_TOKEN: "token",
      UPSTASH_VECTOR_REST_URL: "https://vector",
      UPSTASH_VECTOR_REST_TOKEN: "token",
      LANGSMITH_API_KEY: "ls-key",
      LANGSMITH_PROJECT: "ls-project",
    });

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeLangSmith).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    const res = await GET(makeTestRequest("/api/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const dependencies = body.dependencies as Record<string, string>;
    expect(body.status).toBe("ok");
    expect(dependencies.redis).toBe("ok");
    expect(dependencies.vector).toBe("ok");
    expect(dependencies.langsmith).toBe("ok");
  });

  it("returns 200 and degraded langsmith in non-production when missing config", async () => {
    setEnv({
      NODE_ENV: "test",
      UPSTASH_REDIS_REST_URL: "https://redis",
      UPSTASH_REDIS_REST_TOKEN: "token",
      UPSTASH_VECTOR_REST_URL: "https://vector",
      UPSTASH_VECTOR_REST_TOKEN: "token",
    });
    unsetEnv("LANGSMITH_API_KEY", "LANGSMITH_PROJECT");

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    const res = await GET(makeTestRequest("/api/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const dependencies = body.dependencies as Record<string, string>;
    expect(dependencies.redis).toBe("ok");
    expect(dependencies.vector).toBe("ok");
    expect(dependencies.langsmith).toBe("degraded");
  });

  it("returns 503 in production when critical probe fails", async () => {
    setEnv({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://redis",
      UPSTASH_REDIS_REST_TOKEN: "token",
      UPSTASH_VECTOR_REST_URL: "https://vector",
      UPSTASH_VECTOR_REST_TOKEN: "token",
      LANGSMITH_API_KEY: "ls-key",
      LANGSMITH_PROJECT: "project",
    });

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({
      state: "error",
      detail: "redis_probe_timeout",
    });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeLangSmith).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    const res = await GET(makeTestRequest("/api/health"));
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    const dependencies = body.dependencies as Record<string, string>;
    const details = body.details as Record<string, string>;
    expect(body.status).toBe("degraded");
    expect(dependencies.redis).toBe("error");
    expect(details.redis).toBe("redis_probe_timeout");
  });

  it("returns 503 in production when critical deps are missing", async () => {
    setEnv({
      NODE_ENV: "production",
      LANGSMITH_API_KEY: "ls-key",
      LANGSMITH_PROJECT: "project",
    });
    unsetEnv(
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "UPSTASH_VECTOR_REST_URL",
      "UPSTASH_VECTOR_REST_TOKEN",
    );

    const { GET } = await import("./route");
    const res = await GET(makeTestRequest("/api/health"));
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    const dependencies = body.dependencies as Record<string, string>;
    expect(dependencies.redis).toBe("missing");
    expect(dependencies.vector).toBe("missing");
  });

  it("does not leak secret values in health response", async () => {
    setEnv({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "super-secret-redis-token",
      UPSTASH_VECTOR_REST_URL: "https://vector.example",
      UPSTASH_VECTOR_REST_TOKEN: "super-secret-vector-token",
      LANGSMITH_API_KEY: "super-secret-langsmith-key",
      LANGSMITH_PROJECT: "project",
    });

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeLangSmith).mockResolvedValue({
      state: "error",
      detail: "langsmith_status_401",
    });

    const { GET } = await import("./route");
    const res = await GET(makeTestRequest("/api/health"));
    const text = await res.text();
    expect(text).not.toContain("super-secret-redis-token");
    expect(text).not.toContain("super-secret-vector-token");
    expect(text).not.toContain("super-secret-langsmith-key");
  });

  it("resolves redis config with redteam mode enabled", async () => {
    setEnv({
      NODE_ENV: "test",
      REDTEAM_MODE: "true",
      RED_TEAM_UPSTASH_REDIS_REST_URL: "https://redis-red",
      RED_TEAM_UPSTASH_REDIS_REST_TOKEN: "red-token",
      RED_TEAM_UPSTASH_VECTOR_REST_URL: "https://vector-red",
      RED_TEAM_UPSTASH_VECTOR_REST_TOKEN: "red-token",
    });

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    const res = await GET(makeTestRequest("/api/health"));
    expect(res.status).toBe(200);
    expect(vi.mocked(probes.probeRedis)).toHaveBeenCalledWith("https://redis-red", "red-token");
    expect(vi.mocked(probes.probeVector)).toHaveBeenCalledWith("https://vector-red", "red-token");
  });

  it("resolves default redis config with redteam mode disabled", async () => {
    setEnv({
      NODE_ENV: "test",
      REDTEAM_MODE: "false",
      UPSTASH_REDIS_REST_URL: "https://redis-default",
      UPSTASH_REDIS_REST_TOKEN: "default-token",
      UPSTASH_VECTOR_REST_URL: "https://vector-default",
      UPSTASH_VECTOR_REST_TOKEN: "default-token",
    });

    const probes = await loadProbes();
    vi.mocked(probes.probeRedis).mockResolvedValue({ state: "ok" });
    vi.mocked(probes.probeVector).mockResolvedValue({ state: "ok" });

    const { GET } = await import("./route");
    await GET(makeTestRequest("/api/health"));
    expect(vi.mocked(probes.probeRedis)).toHaveBeenCalledWith(
      "https://redis-default",
      "default-token",
    );
  });
});
