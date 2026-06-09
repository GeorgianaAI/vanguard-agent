import {
  buildGovernanceViewModelFromData,
  type GovernanceViewModel,
} from "@/app/governance/lib/buildGovernanceViewModel";
import { vanguardGraph } from "@/src/lib/agent/graph";
import { buildEvidencePackageForThread } from "@/src/lib/audit/buildEvidencePackageForThread";
import { checkpointMessagesToDashboardMessages } from "@/src/lib/chat/checkpointToUIMessages";
import { reviveLangchainMessages } from "@/src/lib/langchain/reviveLangchainMessages";
import { getThreadPrefix } from "@/src/lib/runtime/redteam";

function messagesFromStateValues(values: unknown): unknown[] | null {
  if (values == null) return null;
  if (Array.isArray(values)) return values;
  if (typeof values === "object" && "messages" in values) {
    const m = (values as { messages: unknown }).messages;
    return Array.isArray(m) ? m : null;
  }
  return null;
}

export type GovernanceSnapshotLoadResult =
  | { ok: true; model: GovernanceViewModel }
  | { ok: false; reason: "invalid_thread" | "no_checkpoint" };

/**
 * Server-only: checkpoint + LangSmith evidence → governance view model for PDF/export.
 */
export async function loadGovernanceSnapshotForThread(
  threadId: string,
  requestId: string,
): Promise<GovernanceSnapshotLoadResult> {
  const prefix = getThreadPrefix();
  if (!threadId.startsWith(prefix)) {
    return { ok: false, reason: "invalid_thread" };
  }

  let snapshot: Awaited<ReturnType<typeof vanguardGraph.getState>>;
  try {
    snapshot = await vanguardGraph.getState({
      configurable: { thread_id: threadId },
    });
  } catch {
    return { ok: false, reason: "no_checkpoint" };
  }

  const raw = messagesFromStateValues(snapshot?.values);
  if (raw == null) {
    return { ok: false, reason: "no_checkpoint" };
  }

  const revived = reviveLangchainMessages(raw);
  const messages = checkpointMessagesToDashboardMessages(revived);

  const values = snapshot?.values as
    | {
        vulnerabilities?: unknown;
        advisoryEnrichmentWarnings?: string[];
        faithfulnessWarnings?: string[];
      }
    | undefined;

  const evidence = await buildEvidencePackageForThread({
    threadId,
    requestId,
  });

  const model = buildGovernanceViewModelFromData(
    messages,
    evidence,
    {
      vulnerabilities: values?.vulnerabilities,
      advisoryWarnings: values?.advisoryEnrichmentWarnings,
      faithfulnessWarnings: values?.faithfulnessWarnings,
    },
    { threadId },
  );

  return { ok: true, model };
}
