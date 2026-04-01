import { vanguardGraph } from "@/src/lib/agent/graph";
import {
  checkpointMessagesToDashboardMessages,
  reviveCheckpointMessages,
} from "@/src/lib/chat/checkpointToUIMessages";
import { getThreadPrefix } from "@/src/lib/runtime/redteam";

export const runtime = "edge";

function messagesFromStateValues(values: unknown): unknown[] | null {
  if (values == null) return null;
  if (Array.isArray(values)) return values;
  if (typeof values === "object" && "messages" in values) {
    const m = (values as { messages: unknown }).messages;
    return Array.isArray(m) ? m : null;
  }
  return null;
}

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

    const raw = messagesFromStateValues(snapshot?.values);
    if (raw == null) {
      return Response.json({ messages: [] });
    }

    const revived = reviveCheckpointMessages(raw);
    const messages = checkpointMessagesToDashboardMessages(revived);
    return Response.json({ messages });
  } catch (error) {
    console.error("GET /api/chat/history:", error);
    return Response.json({ messages: [] });
  }
}
