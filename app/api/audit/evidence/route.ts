import { buildEvidencePackageForThread } from "../../../../src/lib/audit/buildEvidencePackageForThread";
import { newRequestId, withRequestIdHeaders } from "../../chat/telemetry";
import { readActorContext, requireThreadId } from "../../_shared/requestGuards";

export const runtime = "edge";

export async function GET(req: Request) {
  const reqId = newRequestId(req);
  const { actorId, actorRole } = readActorContext(req);
  const url = new URL(req.url);
  const threadId = requireThreadId(url.searchParams);
  const missionId = url.searchParams.get("mission_id")?.trim() || threadId;
  if (!threadId) {
    return withRequestIdHeaders(
      new Response("Missing thread_id", { status: 400 }),
      reqId,
    );
  }

  const pkg = await buildEvidencePackageForThread({
    threadId,
    missionId,
    requestId: reqId,
  });

  return withRequestIdHeaders(
    Response.json(
      {
        ...pkg,
        requested_by: {
          actor_id: actorId ?? null,
          actor_role: actorRole ?? null,
        },
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      },
    ),
    reqId,
  );
}
