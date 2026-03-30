import { buildEvidencePackage } from "../../../../src/lib/audit/evidence";
import { fetchLangSmithRunsForThread } from "../../../../src/lib/audit/langsmith";
import type { LangSmithRun } from "../../../../src/lib/audit/evidence";
import { newRequestId, withRequestIdHeaders } from "../../chat/telemetry";

export const runtime = "edge";

function shouldRequireLangSmithConfig(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

export async function GET(req: Request) {
  const reqId = newRequestId(req);
  const url = new URL(req.url);
  const threadId = url.searchParams.get("thread_id")?.trim();
  const missionId = url.searchParams.get("mission_id")?.trim() || threadId;
  if (!threadId) {
    return withRequestIdHeaders(
      new Response("Missing thread_id", { status: 400 }),
      reqId,
    );
  }

  const warnings: string[] = [];
  let runs: LangSmithRun[] = [];
  let evidenceStatus: "complete" | "degraded" = "complete";
  const missingLangSmithConfig =
    !process.env.LANGSMITH_API_KEY || !process.env.LANGSMITH_PROJECT;
  if (shouldRequireLangSmithConfig() && missingLangSmithConfig) {
    evidenceStatus = "degraded";
    warnings.push(
      "LangSmith is not configured in this non-development environment.",
    );
  }

  try {
    runs = await fetchLangSmithRunsForThread(threadId);
    if (runs.length === 0) {
      warnings.push("No LangSmith traces found for this thread.");
    }
  } catch (err) {
    evidenceStatus = "degraded";
    warnings.push(
      err instanceof Error ? err.message : "LangSmith trace query failed.",
    );
  }

  const pkg = buildEvidencePackage({
    missionId: missionId ?? threadId,
    threadId,
    requestId: reqId,
    generatedAt: new Date().toISOString(),
    runs,
    evidenceStatus,
    warnings,
  });

  return withRequestIdHeaders(
    Response.json(pkg, {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    }),
    reqId,
  );
}
