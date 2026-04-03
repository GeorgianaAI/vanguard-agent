import { buildEvidencePackageForThread } from "../../../../src/lib/audit/buildEvidencePackageForThread";
import { newRequestId, withRequestIdHeaders } from "../../chat/telemetry";

export const runtime = "edge";

export async function GET(req: Request) {
  const reqId = newRequestId(req);
  const actorId = req.headers.get("x-actor-id");
  const actorRole = req.headers.get("x-actor-role");

  const url = new URL(req.url);
  const threadId = url.searchParams.get("thread_id")?.trim();
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
