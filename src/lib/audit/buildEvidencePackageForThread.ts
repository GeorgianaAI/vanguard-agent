import { buildEvidencePackage } from "./evidence";
import type { EvidencePackage, LangSmithRun } from "./evidence";
import { fetchLangSmithRunsForThread } from "./langsmith";

function shouldRequireLangSmithConfig(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

/**
 * Shared evidence package builder for API routes and PDF export.
 */
export async function buildEvidencePackageForThread(params: {
  threadId: string;
  missionId?: string | null;
  requestId: string;
}): Promise<EvidencePackage> {
  const { threadId, requestId } = params;
  const missionId = params.missionId?.trim() || threadId;

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

  return buildEvidencePackage({
    missionId,
    threadId,
    requestId,
    generatedAt: new Date().toISOString(),
    runs,
    evidenceStatus,
    warnings,
  });
}
