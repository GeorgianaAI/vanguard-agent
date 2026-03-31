#!/usr/bin/env node

function hasValue(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function hasEither(env, first, second) {
  return hasValue(env[first]) || hasValue(env[second]);
}

const target = process.env.VERIFY_TARGET_ENV === "production" ? "production" : "non-production";
const env = process.env;
const missing = [];

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
if (target === "production" && !hasEither(env, "APP_BASE_URL", "VERCEL_URL")) {
  missing.push("APP_BASE_URL (or VERCEL_URL)");
}

if (missing.length > 0) {
  console.error(`[env-parity] Missing required env vars for ${target}:`);
  for (const name of missing) console.error(` - ${name}`);
  process.exit(1);
}

console.log(`[env-parity] OK for ${target}`);
