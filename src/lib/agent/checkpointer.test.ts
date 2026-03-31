import { afterEach, describe, expect, it } from "vitest";
import { getCheckpointer } from "./checkpointer";

describe("getCheckpointer", () => {
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const prevRtUrl = process.env.RED_TEAM_UPSTASH_REDIS_REST_URL;
  const prevRtToken = process.env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN;
  const prevMode = process.env.REDTEAM_MODE;

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    process.env.RED_TEAM_UPSTASH_REDIS_REST_URL = prevRtUrl;
    process.env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN = prevRtToken;
    process.env.REDTEAM_MODE = prevMode;
  });

  it("returns undefined when redis env is missing", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_URL;
    delete process.env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN;
    process.env.REDTEAM_MODE = "true";
    const cp = getCheckpointer();
    expect(cp).toBeUndefined();
  });
});
