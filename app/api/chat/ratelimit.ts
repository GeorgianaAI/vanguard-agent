import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  isProductionEnv,
  resolveRedisEnv,
} from "../../../src/lib/runtime/redteam";

const MISSION_RATE_LIMIT_WINDOW = "60 s";
const MISSION_RATE_LIMIT_REQUESTS = 5;
const MISSION_HOURLY_RATE_LIMIT_WINDOW = "1 h";
const MISSION_HOURLY_RATE_LIMIT_REQUESTS = 5;
const APPROVAL_RATE_LIMIT_WINDOW = "60 s";
const APPROVAL_RATE_LIMIT_REQUESTS = 20;

const redisEnv = resolveRedisEnv();

export const redisConfigMissing = !redisEnv.url || !redisEnv.token;

if (redisConfigMissing) {
  console.warn(
    isProductionEnv()
      ? "Redis configuration missing in production context; API will hard-fail mission/approval requests with 503."
      : "Redis configuration missing outside production; API will run in degraded mode.",
  );
}

export const redis =
  redisEnv.url && redisEnv.token
    ? new Redis({ url: redisEnv.url, token: redisEnv.token })
    : null;

export const missionRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        MISSION_RATE_LIMIT_REQUESTS,
        MISSION_RATE_LIMIT_WINDOW,
      ),
      analytics: true,
      prefix: `@${redisEnv.keyPrefix}/ratelimit/mission`,
    })
  : null;

export const missionHourlyRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        MISSION_HOURLY_RATE_LIMIT_REQUESTS,
        MISSION_HOURLY_RATE_LIMIT_WINDOW,
      ),
      analytics: true,
      prefix: `@${redisEnv.keyPrefix}/ratelimit/mission/hourly`,
    })
  : null;

export const approvalRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        APPROVAL_RATE_LIMIT_REQUESTS,
        APPROVAL_RATE_LIMIT_WINDOW,
      ),
      analytics: true,
      prefix: `@${redisEnv.keyPrefix}/ratelimit/approval`,
    })
  : null;
