import { RUNTIME_ENV_KEYS } from "./envKeys";

type EnvSource = Record<string, string | undefined>;

function readBool(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function isRedTeamMode(env: EnvSource = process.env): boolean {
  return (
    readBool(env[RUNTIME_ENV_KEYS.redteamMode]) || readBool(env[RUNTIME_ENV_KEYS.redteamModePublic])
  );
}

export function isProductionEnv(env: EnvSource = process.env): boolean {
  return env.NODE_ENV === "production";
}

export function getLangSmithProject(env: EnvSource = process.env): string | undefined {
  if (isRedTeamMode(env)) {
    return env[RUNTIME_ENV_KEYS.redTeamLangsmithProject] ?? env[RUNTIME_ENV_KEYS.langsmithProject];
  }
  return env[RUNTIME_ENV_KEYS.langsmithProject];
}

export function getThreadPrefix(env: EnvSource = process.env): string {
  if (!isRedTeamMode(env)) return "vanguard";
  return env[RUNTIME_ENV_KEYS.redTeamThreadPrefix] ?? "redteam-ci";
}

export function resolveRedisEnv(env: EnvSource = process.env): {
  url?: string;
  token?: string;
  keyPrefix: string;
} {
  if (isRedTeamMode(env)) {
    return {
      url: env[RUNTIME_ENV_KEYS.redTeamUpstashRedisUrl] ?? env[RUNTIME_ENV_KEYS.upstashRedisUrl],
      token:
        env[RUNTIME_ENV_KEYS.redTeamUpstashRedisToken] ?? env[RUNTIME_ENV_KEYS.upstashRedisToken],
      keyPrefix: env[RUNTIME_ENV_KEYS.redTeamRedisKeyPrefix] ?? "vanguard:redteam",
    };
  }
  return {
    url: env[RUNTIME_ENV_KEYS.upstashRedisUrl],
    token: env[RUNTIME_ENV_KEYS.upstashRedisToken],
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
      url: env[RUNTIME_ENV_KEYS.redTeamUpstashVectorUrl] ?? env[RUNTIME_ENV_KEYS.upstashVectorUrl],
      token:
        env[RUNTIME_ENV_KEYS.redTeamUpstashVectorToken] ?? env[RUNTIME_ENV_KEYS.upstashVectorToken],
      namespace:
        env[RUNTIME_ENV_KEYS.redTeamVectorNamespace] ??
        (env.CI ? "redteam-ci-0000000001" : "redteam-local-00000001"),
    };
  }
  return {
    url: env[RUNTIME_ENV_KEYS.upstashVectorUrl],
    token: env[RUNTIME_ENV_KEYS.upstashVectorToken],
    namespace: env[RUNTIME_ENV_KEYS.upstashVectorNamespace] ?? "vanguard-default",
  };
}
