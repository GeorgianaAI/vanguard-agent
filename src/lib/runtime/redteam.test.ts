import { describe, expect, it } from "vitest";
import {
  getLangSmithProject,
  getThreadPrefix,
  isRedTeamMode,
  resolveRedisEnv,
  resolveVectorEnv,
} from "./redteam";

describe("redteam runtime config", () => {
  it("defaults to non-redteam mode", () => {
    expect(isRedTeamMode({})).toBe(false);
    expect(getThreadPrefix({})).toBe("vanguard");
  });

  it("enables redteam mode via env toggle", () => {
    const env = { REDTEAM_MODE: "true" };
    expect(isRedTeamMode(env)).toBe(true);
    expect(getThreadPrefix(env)).toBe("redteam-ci");
  });

  it("enables redteam mode via NEXT_PUBLIC toggle for client paths", () => {
    const env = { NEXT_PUBLIC_REDTEAM_MODE: "true" };
    expect(isRedTeamMode(env)).toBe(true);
    expect(getThreadPrefix(env)).toBe("redteam-ci");
  });

  it("resolves redis env with redteam fallback behavior", () => {
    const env = {
      REDTEAM_MODE: "true",
      UPSTASH_REDIS_REST_URL: "https://shared.redis",
      UPSTASH_REDIS_REST_TOKEN: "shared-token",
    };
    expect(resolveRedisEnv(env)).toEqual({
      url: "https://shared.redis",
      token: "shared-token",
      keyPrefix: "vanguard:redteam",
    });
  });

  it("prefers dedicated redteam redis vars when present", () => {
    const env = {
      REDTEAM_MODE: "true",
      RED_TEAM_UPSTASH_REDIS_REST_URL: "https://rt.redis",
      RED_TEAM_UPSTASH_REDIS_REST_TOKEN: "rt-token",
      RED_TEAM_REDIS_KEY_PREFIX: "vanguard:rt",
    };
    expect(resolveRedisEnv(env)).toEqual({
      url: "https://rt.redis",
      token: "rt-token",
      keyPrefix: "vanguard:rt",
    });
  });

  it("resolves vector namespace for redteam runs", () => {
    const env = {
      REDTEAM_MODE: "true",
      UPSTASH_VECTOR_REST_URL: "https://vector",
      UPSTASH_VECTOR_REST_TOKEN: "token",
      CI: "true",
    };
    expect(resolveVectorEnv(env).namespace).toBe("redteam-ci-0000000001");
  });

  it("uses redteam LangSmith project override when available", () => {
    const env = {
      REDTEAM_MODE: "true",
      RED_TEAM_LANGSMITH_PROJECT: "vanguard-red-team",
      LANGSMITH_PROJECT: "vanguard-agent-recon",
    };
    expect(getLangSmithProject(env)).toBe("vanguard-red-team");
  });
});
