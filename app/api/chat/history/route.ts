import { vanguardGraph } from "@/src/lib/agent/graph";
import { checkpointMessagesToDashboardMessages } from "@/src/lib/chat/checkpointToUIMessages";
import { getThreadPrefix } from "@/src/lib/runtime/redteam";

export const runtime = "edge";

/**
 * Read-only mission transcript from LangGraph checkpoint (Redis).
 * Requires authenticated session with `mission:run` (middleware).
 */
export async function GET(req: Request) {
  const actorId = req.headers.get("x-actor-id");
  if (!actorId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const threadId = url.searchParams.get("thread_id")?.trim();
  if (!threadId) {
    return Response.json({ error: "Missing thread_id" }, { status: 400 });
  }

  if (!threadId.startsWith(getThreadPrefix())) {
    return Response.json({ error: "Invalid thread_id" }, { status: 400 });
  }

  try {
    const snapshot = await vanguardGraph.getState({
      configurable: { thread_id: threadId },
    });

    const values = snapshot?.values as { messages?: unknown[] } | undefined;
    const raw = values?.messages;
    if (!Array.isArray(raw)) {
      return Response.json({ messages: [] });
    }

    const messages = checkpointMessagesToDashboardMessages(
      raw as Parameters<typeof checkpointMessagesToDashboardMessages>[0],
    );
    return Response.json({ messages });
  } catch (error) {
    console.error("GET /api/chat/history:", error);
    return Response.json({ messages: [] });
  }
}
