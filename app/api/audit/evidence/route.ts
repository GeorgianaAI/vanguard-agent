import { buildEvidencePackage } from "../../../../src/lib/audit/evidence";
import { fetchLangSmithRunsForThread } from "../../../../src/lib/audit/langsmith";
import type { LangSmithRun } from "../../../../src/lib/audit/evidence";
import { newRequestId, withRequestIdHeaders } from "../../chat/telemetry";

export const runtime = "edge";

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
  try {
    runs = await fetchLangSmithRunsForThread(threadId);
    if (runs.length === 0) {
      warnings.push("No LangSmith traces found for this thread.");
    }
  } catch (err) {
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
