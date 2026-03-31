import { getLangSmithProject } from "../../../src/lib/runtime/redteam";
import { resolveRedisEnv, isProductionEnv } from "../../../src/lib/runtime/redteam";
import { getVectorRuntimeConfig } from "../../../src/lib/runtime/vectorClient";
import { newRequestId, withRequestIdHeaders } from "../chat/telemetry";

export const runtime = "edge";

type HealthState = "ok" | "missing" | "error" | "degraded";

export async function GET(req: Request) {
  const reqId = newRequestId(req);
  const redis = resolveRedisEnv();
  const vector = getVectorRuntimeConfig();
  const langsmithProject = getLangSmithProject();
  const langsmithApiKey = process.env.LANGSMITH_API_KEY;

  const redisState: HealthState =
    redis.url && redis.token ? "ok" : "missing";
  const vectorState: HealthState =
    vector.url && vector.token ? "ok" : "missing";
  const langsmithState: HealthState =
    langsmithApiKey && langsmithProject ? "ok" : "degraded";

  const prodCriticalMissing =
    isProductionEnv() && (redisState !== "ok" || vectorState !== "ok");
  const status = prodCriticalMissing ? 503 : 200;

  const payload = {
    status: status === 200 ? "ok" : "degraded",
    env: isProductionEnv() ? "production" : "non-production",
    dependencies: {
      redis: redisState,
      vector: vectorState,
      langsmith: langsmithState,
    },
  };

  return withRequestIdHeaders(
    Response.json(payload, {
      status,
      headers: { "cache-control": "no-store" },
    }),
    reqId,
  );
}
