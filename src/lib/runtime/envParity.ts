type EnvMap = Record<string, string | undefined>;

export type ParityTarget = "production" | "non-production";

export type ParityResult = {
  ok: boolean;
  missing: string[];
};

function hasValue(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function hasEither(env: EnvMap, first: string, second: string): boolean {
  return hasValue(env[first]) || hasValue(env[second]);
}

export function checkEnvParity(
  env: EnvMap = process.env,
  target: ParityTarget,
): ParityResult {
  const missing: string[] = [];

  if (!hasEither(env, "UPSTASH_REDIS_REST_URL", "RED_TEAM_UPSTASH_REDIS_REST_URL")) {
    missing.push("UPSTASH_REDIS_REST_URL (or RED_TEAM_UPSTASH_REDIS_REST_URL)");
  }
  if (!hasEither(env, "UPSTASH_REDIS_REST_TOKEN", "RED_TEAM_UPSTASH_REDIS_REST_TOKEN")) {
    missing.push("UPSTASH_REDIS_REST_TOKEN (or RED_TEAM_UPSTASH_REDIS_REST_TOKEN)");
  }
  if (!hasEither(env, "UPSTASH_VECTOR_REST_URL", "RED_TEAM_UPSTASH_VECTOR_REST_URL")) {
    missing.push("UPSTASH_VECTOR_REST_URL (or RED_TEAM_UPSTASH_VECTOR_REST_URL)");
  }
  if (!hasEither(env, "UPSTASH_VECTOR_REST_TOKEN", "RED_TEAM_UPSTASH_VECTOR_REST_TOKEN")) {
    missing.push("UPSTASH_VECTOR_REST_TOKEN (or RED_TEAM_UPSTASH_VECTOR_REST_TOKEN)");
  }

  if (target === "production" && !hasValue(env.VERCEL_URL) && !hasValue(env.APP_BASE_URL)) {
    missing.push("APP_BASE_URL (or VERCEL_URL)");
  }

  return { ok: missing.length === 0, missing };
}
