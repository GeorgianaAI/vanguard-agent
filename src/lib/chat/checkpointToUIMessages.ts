import { AIMessage, HumanMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import type { DashboardMessage } from "@/app/dashboard/lib/types";
import { readAgentNodeFromLangchainMessage } from "@/src/lib/agent/agentNode";

function humanText(m: HumanMessage): string {
  const c = m.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((block) => {
        if (
          block &&
          typeof block === "object" &&
          "type" in block &&
          (block as { type: unknown }).type === "text" &&
          "text" in block
        ) {
          return String((block as { text: unknown }).text ?? "");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function aiStringContent(m: AIMessage): string {
  const c = m.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((block) => {
        if (
          block &&
          typeof block === "object" &&
          "type" in block &&
          (block as { type: unknown }).type === "text" &&
          "text" in block
        ) {
          return String((block as { text: unknown }).text ?? "");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

/**
 * Best-effort LangGraph checkpoint messages → AI SDK UI messages for rehydration.
 * Tool results are merged into the assistant bubble that issued `tool_calls`.
 */
export function checkpointMessagesToDashboardMessages(messages: BaseMessage[]): DashboardMessage[] {
  const out: DashboardMessage[] = [];
  let i = 0;

  while (i < messages.length) {
    const m = messages[i];

    if (HumanMessage.isInstance(m)) {
      out.push({
        id: `hist-${i}-user`,
        role: "user",
        parts: [{ type: "text", text: humanText(m) }],
      });
      i += 1;
      continue;
    }

    if (AIMessage.isInstance(m)) {
      const node = readAgentNodeFromLangchainMessage(m);
      const parts: DashboardMessage["parts"] = [];
      const text = aiStringContent(m);
      if (text.trim().length > 0) {
        parts.push({ type: "text", text });
      }

      const toolCalls = m.tool_calls ?? [];
      const tcIds = new Set(
        toolCalls.map((tc) => tc.id).filter((id): id is string => typeof id === "string"),
      );

      let j = i + 1;
      if (tcIds.size > 0) {
        while (j < messages.length && ToolMessage.isInstance(messages[j])) {
          const tm = messages[j] as ToolMessage;
          const tid = tm.tool_call_id;
          if (typeof tid !== "string" || !tcIds.has(tid)) break;
          j += 1;
        }
      }

      const toolRowById = new Map<string, ToolMessage>();
      for (let k = i + 1; k < j; k += 1) {
        const row = messages[k];
        if (ToolMessage.isInstance(row) && typeof row.tool_call_id === "string") {
          toolRowById.set(row.tool_call_id, row);
        }
      }

      for (const tc of toolCalls) {
        const id = typeof tc.id === "string" ? tc.id : `tc-${i}-${parts.length}`;
        const name = typeof tc.name === "string" ? tc.name : "unknown";
        const args = tc.args && typeof tc.args === "object" ? tc.args : {};
        const row = toolRowById.get(id);
        const output = row?.content;

        parts.push({
          type: "dynamic-tool",
          toolName: name,
          toolCallId: id,
          state: "output-available",
          input: args,
          output:
            typeof output === "string" ? output : output != null ? JSON.stringify(output) : null,
        });
      }

      if (parts.length === 0) {
        parts.push({ type: "text", text: "" });
      }

      out.push({
        id: `hist-${i}-assistant`,
        role: "assistant",
        parts,
        ...(node ? { metadata: { agent_node: node } } : {}),
      });

      i = tcIds.size > 0 ? j : i + 1;
      continue;
    }

    if (ToolMessage.isInstance(m)) {
      i += 1;
      continue;
    }

    i += 1;
  }

  return out;
}
