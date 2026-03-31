import { afterEach, describe, expect, it } from "vitest";
import { getCheckpointer } from "./checkpointer";

const prevEnv = { ...process.env };

describe("getCheckpointer", () => {
  afterEach(() => {
    process.env = { ...prevEnv };
  });

  it("returns undefined in non-production when redis env is missing", () => {
    process.env.NODE_ENV = "test";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_URL;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN;

    expect(getCheckpointer()).toBeUndefined();
  });

  it("throws in production when redis env is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PHASE;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_URL;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN;

    expect(() => getCheckpointer()).toThrow(/Missing Redis configuration/);
  });

  it("returns undefined during production build phase when redis env is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PHASE = "phase-production-build";
    delete process.env.CI;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_URL;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN;

    expect(getCheckpointer()).toBeUndefined();
  });

  it("returns undefined during CI runtime in production when redis env is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.CI = "true";
    delete process.env.NEXT_PHASE;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_URL;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN;

    expect(getCheckpointer()).toBeUndefined();
  });

  it("returns undefined in non-production redteam mode when redis env is missing", () => {
    process.env.NODE_ENV = "test";
    process.env.REDTEAM_MODE = "true";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_URL;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN;

    expect(getCheckpointer()).toBeUndefined();
  });
});
