export const RUNTIME_ENV_KEYS = {
  redteamMode: "REDTEAM_MODE",
  redteamModePublic: "NEXT_PUBLIC_REDTEAM_MODE",

  langsmithProject: "LANGSMITH_PROJECT",
  redTeamLangsmithProject: "RED_TEAM_LANGSMITH_PROJECT",

  redTeamThreadPrefix: "RED_TEAM_THREAD_PREFIX",

  upstashRedisUrl: "UPSTASH_REDIS_REST_URL",
  upstashRedisToken: "UPSTASH_REDIS_REST_TOKEN",
  redTeamUpstashRedisUrl: "RED_TEAM_UPSTASH_REDIS_REST_URL",
  redTeamUpstashRedisToken: "RED_TEAM_UPSTASH_REDIS_REST_TOKEN",
  redTeamRedisKeyPrefix: "RED_TEAM_REDIS_KEY_PREFIX",

  upstashVectorUrl: "UPSTASH_VECTOR_REST_URL",
  upstashVectorToken: "UPSTASH_VECTOR_REST_TOKEN",
  upstashVectorNamespace: "UPSTASH_VECTOR_NAMESPACE",
  redTeamUpstashVectorUrl: "RED_TEAM_UPSTASH_VECTOR_REST_URL",
  redTeamUpstashVectorToken: "RED_TEAM_UPSTASH_VECTOR_REST_TOKEN",
  redTeamVectorNamespace: "RED_TEAM_VECTOR_NAMESPACE",

  vercelUrl: "VERCEL_URL",
  appBaseUrl: "APP_BASE_URL",
} as const;

export type EnvPair = {
  primary: string;
  redTeam: string;
};

export const UPSTASH_PARITY_PAIRS: ReadonlyArray<EnvPair> = [
  {
    primary: RUNTIME_ENV_KEYS.upstashRedisUrl,
    redTeam: RUNTIME_ENV_KEYS.redTeamUpstashRedisUrl,
  },
  {
    primary: RUNTIME_ENV_KEYS.upstashRedisToken,
    redTeam: RUNTIME_ENV_KEYS.redTeamUpstashRedisToken,
  },
  {
    primary: RUNTIME_ENV_KEYS.upstashVectorUrl,
    redTeam: RUNTIME_ENV_KEYS.redTeamUpstashVectorUrl,
  },
  {
    primary: RUNTIME_ENV_KEYS.upstashVectorToken,
    redTeam: RUNTIME_ENV_KEYS.redTeamUpstashVectorToken,
  },
];

export function formatEitherLabel(primary: string, fallback: string): string {
  return `${primary} (or ${fallback})`;
}
