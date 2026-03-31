import { Index } from "@upstash/vector";
import { resolveVectorEnv } from "./redteam";

type EnvSource = Record<string, string | undefined>;

export function getVectorRuntimeConfig(env: EnvSource = process.env) {
  return resolveVectorEnv(env);
}

export function createVectorIndex() {
  const cfg = resolveVectorEnv();
  if (!cfg.url || !cfg.token) {
    return null;
  }
  return new Index({
    url: cfg.url,
    token: cfg.token,
  });
}
