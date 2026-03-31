import { afterEach, describe, expect, it } from "vitest";

const originalEnv = { ...process.env };

describe("GET /api/health", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 200 and degraded langsmith in non-production", async () => {
    process.env.NODE_ENV = "test";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.UPSTASH_VECTOR_REST_URL = "https://vector";
    process.env.UPSTASH_VECTOR_REST_TOKEN = "token";
    delete process.env.LANGSMITH_API_KEY;
    delete process.env.LANGSMITH_PROJECT;

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      dependencies: Record<string, string>;
    };
    expect(body.dependencies.redis).toBe("ok");
    expect(body.dependencies.vector).toBe("ok");
    expect(body.dependencies.langsmith).toBe("degraded");
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
    const body = (await res.json()) as {
      dependencies: Record<string, string>;
    };
    expect(body.dependencies.redis).toBe("missing");
    expect(body.dependencies.vector).toBe("missing");
  });
});
