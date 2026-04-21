import { RUNTIME_ENV_KEYS, UPSTASH_PARITY_PAIRS, formatEitherLabel } from "./envKeys";

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

export function checkEnvParity(env: EnvMap = process.env, target: ParityTarget): ParityResult {
  const missing: string[] = [];

  for (const pair of UPSTASH_PARITY_PAIRS) {
    if (!hasEither(env, pair.primary, pair.redTeam)) {
      missing.push(formatEitherLabel(pair.primary, pair.redTeam));
    }
  }

  if (
    target === "production" &&
    !hasValue(env[RUNTIME_ENV_KEYS.vercelUrl]) &&
    !hasValue(env[RUNTIME_ENV_KEYS.appBaseUrl])
  ) {
    missing.push(formatEitherLabel(RUNTIME_ENV_KEYS.appBaseUrl, RUNTIME_ENV_KEYS.vercelUrl));
  }

  return { ok: missing.length === 0, missing };
}
