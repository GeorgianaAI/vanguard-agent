import { newRequestId } from "@/app/api/chat/telemetry";
import { loadGovernanceSnapshotForThread } from "@/src/lib/governance/loadGovernanceSnapshot";
import { renderGovernanceCompliancePdf } from "@/src/lib/governance/renderGovernancePdf";

/** pdf-lib + checkpoint graph: Node runtime. */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const actorId = req.headers.get("x-actor-id");
  if (!actorId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const threadId = url.searchParams.get("thread_id")?.trim();
  if (!threadId) {
    return new Response("Missing thread_id", { status: 400 });
  }

  const reqId = newRequestId(req);
  const loaded = await loadGovernanceSnapshotForThread(threadId, reqId);
  if (!loaded.ok) {
    const status = loaded.reason === "invalid_thread" ? 400 : 404;
    const text =
      loaded.reason === "invalid_thread"
        ? "Invalid thread_id"
        : "No checkpoint for this thread";
    return new Response(text, { status });
  }

  const pdfBytes = await renderGovernanceCompliancePdf({
    generatedAtIso: new Date().toISOString(),
    model: loaded.model,
  });

  const safeName = threadId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-48);

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="vanguard-governance-${safeName}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
