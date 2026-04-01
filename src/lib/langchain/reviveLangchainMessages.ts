import {
  coerceMessageLikeToMessage,
  isBaseMessage,
  mapStoredMessagesToChatMessages,
  type BaseMessage,
} from "@langchain/core/messages";

/**
 * Redis checkpoints and JSON round-trips often yield plain message objects.
 * LangGraph's ToolNode and `isBaseMessage()` require real class instances.
 */
export function reviveLangchainMessages(raw: unknown[]): BaseMessage[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const first = raw[0];
  if (
    typeof first === "object" &&
    first !== null &&
    isBaseMessage(first)
  ) {
    return raw.filter(
      (m): m is BaseMessage =>
        typeof m === "object" && m !== null && isBaseMessage(m),
    );
  }

  try {
    return mapStoredMessagesToChatMessages(raw as never);
  } catch {
    // Not StoredMessage/V1 shape; try LangChain coercion (serialized ctor, …).
  }

  const out: BaseMessage[] = [];
  for (const m of raw) {
    if (typeof m !== "object" || m === null) continue;
    try {
      out.push(coerceMessageLikeToMessage(m as never));
    } catch {
      // skip malformed row
    }
  }
  return out;
}
