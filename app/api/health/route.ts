import { getLangSmithProject } from "../../../src/lib/runtime/redteam";
import { resolveRedisEnv, isProductionEnv } from "../../../src/lib/runtime/redteam";
import { getVectorRuntimeConfig } from "../../../src/lib/runtime/vectorClient";
import {
  probeLangSmith,
  probeRedis,
  probeVector,
  sendHealthAlert,
} from "../../../src/lib/runtime/healthProbes";
import { newRequestId, withRequestIdHeaders } from "../chat/telemetry";

export const runtime = "edge";

type HealthState = "ok" | "missing" | "error" | "degraded";

export async function GET(req: Request) {
  const reqId = newRequestId(req);
  const redis = resolveRedisEnv();
  const vector = getVectorRuntimeConfig();
  const langsmithProject = getLangSmithProject();
  const langsmithApiKey = process.env.LANGSMITH_API_KEY;

  const details: Record<string, string> = {};

  let redisState: HealthState = redis.url && redis.token ? "ok" : "missing";
  if (redisState === "ok") {
    const result = await probeRedis(redis.url!, redis.token!);
    if (result.state === "error") {
      redisState = "error";
      details.redis = result.detail ?? "redis_probe_failed";
    }
  }

  let vectorState: HealthState = vector.url && vector.token ? "ok" : "missing";
  if (vectorState === "ok") {
    const result = await probeVector(vector.url!, vector.token!);
    if (result.state === "error") {
      vectorState = "error";
      details.vector = result.detail ?? "vector_probe_failed";
    }
  }

  let langsmithState: HealthState = "degraded";
  if (langsmithApiKey && langsmithProject) {
    const endpoint = process.env.LANGSMITH_ENDPOINT ?? "https://api.smith.langchain.com";
    const result = await probeLangSmith(endpoint, langsmithApiKey);
    if (result.state === "ok") {
      langsmithState = "ok";
    } else {
      langsmithState = "error";
      details.langsmith = result.detail ?? "langsmith_probe_failed";
    }
  } else if (isProductionEnv()) {
    langsmithState = "missing";
  }

  const prodCriticalMissing = isProductionEnv() && (redisState !== "ok" || vectorState !== "ok");
  const status = prodCriticalMissing ? 503 : 200;

  if (status !== 200) {
    console.error(
      JSON.stringify({
        component: "vanguard.api.health",
        reqId,
        level: "error",
        event: "production_health_degraded",
        dependencies: { redis: redisState, vector: vectorState, langsmith: langsmithState },
      }),
    );
    await sendHealthAlert({
      reqId,
      event: "production_health_degraded",
      dependencies: { redis: redisState, vector: vectorState, langsmith: langsmithState },
    });
  } else if (redisState !== "ok" || vectorState !== "ok" || langsmithState !== "ok") {
    console.warn(
      JSON.stringify({
        component: "vanguard.api.health",
        reqId,
        level: "warn",
        event: "non_production_health_degraded",
        dependencies: { redis: redisState, vector: vectorState, langsmith: langsmithState },
      }),
    );
  }

  const payload = {
    status: status === 200 ? "ok" : "degraded",
    env: isProductionEnv() ? "production" : "non-production",
    dependencies: {
      redis: redisState,
      vector: vectorState,
      langsmith: langsmithState,
    },
    details,
  };

  return withRequestIdHeaders(
    Response.json(payload, {
      status,
      headers: { "cache-control": "no-store" },
    }),
    reqId,
  );
}
