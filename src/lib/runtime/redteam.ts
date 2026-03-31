type EnvSource = Record<string, string | undefined>;

function readBool(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function isRedTeamMode(env: EnvSource = process.env): boolean {
  return readBool(env.REDTEAM_MODE) || readBool(env.NEXT_PUBLIC_REDTEAM_MODE);
}

export function getLangSmithProject(env: EnvSource = process.env): string | undefined {
  if (isRedTeamMode(env)) {
    return env.RED_TEAM_LANGSMITH_PROJECT ?? env.LANGSMITH_PROJECT;
  }
  return env.LANGSMITH_PROJECT;
}

export function getThreadPrefix(env: EnvSource = process.env): string {
  if (!isRedTeamMode(env)) return "vanguard";
  return env.RED_TEAM_THREAD_PREFIX ?? "redteam-ci";
}

export function resolveRedisEnv(env: EnvSource = process.env): {
  url?: string;
  token?: string;
  keyPrefix: string;
} {
  if (isRedTeamMode(env)) {
    return {
      url: env.RED_TEAM_UPSTASH_REDIS_REST_URL ?? env.UPSTASH_REDIS_REST_URL,
      token:
        env.RED_TEAM_UPSTASH_REDIS_REST_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN,
      keyPrefix: env.RED_TEAM_REDIS_KEY_PREFIX ?? "vanguard:redteam",
    };
  }
  return {
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
    keyPrefix: "vanguard",
  };
}

export function resolveVectorEnv(env: EnvSource = process.env): {
  url?: string;
  token?: string;
  namespace: string;
} {
  if (isRedTeamMode(env)) {
    return {
      url: env.RED_TEAM_UPSTASH_VECTOR_REST_URL ?? env.UPSTASH_VECTOR_REST_URL,
      token:
        env.RED_TEAM_UPSTASH_VECTOR_REST_TOKEN ??
        env.UPSTASH_VECTOR_REST_TOKEN,
      namespace:
        env.RED_TEAM_VECTOR_NAMESPACE ??
        (env.CI ? "redteam-ci-0000000001" : "redteam-local-00000001"),
    };
  }
  return {
    url: env.UPSTASH_VECTOR_REST_URL,
    token: env.UPSTASH_VECTOR_REST_TOKEN,
    namespace: env.UPSTASH_VECTOR_NAMESPACE ?? "vanguard-default",
  };
}
