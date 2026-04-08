import { describe, expect, it } from "vitest";
import { checkEnvParity } from "./envParity";

describe("checkEnvParity", () => {
  it("returns missing vars list when required vars are absent", () => {
    const result = checkEnvParity({}, "production");
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([
        "UPSTASH_REDIS_REST_URL (or RED_TEAM_UPSTASH_REDIS_REST_URL)",
        "UPSTASH_REDIS_REST_TOKEN (or RED_TEAM_UPSTASH_REDIS_REST_TOKEN)",
        "UPSTASH_VECTOR_REST_URL (or RED_TEAM_UPSTASH_VECTOR_REST_URL)",
        "UPSTASH_VECTOR_REST_TOKEN (or RED_TEAM_UPSTASH_VECTOR_REST_TOKEN)",
        "APP_BASE_URL (or VERCEL_URL)",
      ]),
    );
  });

  it("passes when core vars are present", () => {
    const result = checkEnvParity(
      {
        UPSTASH_REDIS_REST_URL: "https://redis",
        UPSTASH_REDIS_REST_TOKEN: "token",
        UPSTASH_VECTOR_REST_URL: "https://vector",
        UPSTASH_VECTOR_REST_TOKEN: "token",
      },
      "non-production",
    );
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("accepts RED_TEAM_* fallback keys when primary keys are absent", () => {
    const result = checkEnvParity(
      {
        RED_TEAM_UPSTASH_REDIS_REST_URL: "https://rt-redis",
        RED_TEAM_UPSTASH_REDIS_REST_TOKEN: "rt-token",
        RED_TEAM_UPSTASH_VECTOR_REST_URL: "https://rt-vector",
        RED_TEAM_UPSTASH_VECTOR_REST_TOKEN: "rt-token",
      },
      "non-production",
    );
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("requires APP_BASE_URL or VERCEL_URL only in production", () => {
    const nonProd = checkEnvParity(
      {
        UPSTASH_REDIS_REST_URL: "https://redis",
        UPSTASH_REDIS_REST_TOKEN: "token",
        UPSTASH_VECTOR_REST_URL: "https://vector",
        UPSTASH_VECTOR_REST_TOKEN: "token",
      },
      "non-production",
    );
    expect(nonProd.ok).toBe(true);

    const prod = checkEnvParity(
      {
        UPSTASH_REDIS_REST_URL: "https://redis",
        UPSTASH_REDIS_REST_TOKEN: "token",
        UPSTASH_VECTOR_REST_URL: "https://vector",
        UPSTASH_VECTOR_REST_TOKEN: "token",
      },
      "production",
    );
    expect(prod.ok).toBe(false);
    expect(prod.missing).toContain("APP_BASE_URL (or VERCEL_URL)");
  });

  it("passes production parity when VERCEL_URL is set", () => {
    const result = checkEnvParity(
      {
        UPSTASH_REDIS_REST_URL: "https://redis",
        UPSTASH_REDIS_REST_TOKEN: "token",
        UPSTASH_VECTOR_REST_URL: "https://vector",
        UPSTASH_VECTOR_REST_TOKEN: "token",
        VERCEL_URL: "my-app.vercel.app",
      },
      "production",
    );
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});
