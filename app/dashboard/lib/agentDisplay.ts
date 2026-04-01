import type { DashboardMessage, ToolPart } from "./types";
import type { AgentType } from "../components/AgentBadge";
import {
  getApprovalContextFromMessage,
  messageHasApprovalSignal,
  renderMessageText,
} from "./utils";
import { isToolUIPart } from "ai";

function resolveAssistantAgentTypeHeuristic(opts: {
  text: string;
  hasToolParts: boolean;
  hasApprovalSignal: boolean;
  requestedByNode?: "supervisor" | "scout" | "system";
}): AgentType {
  if (opts.requestedByNode === "scout") return "SCOUT";
  if (opts.requestedByNode === "supervisor") return "SUPERVISOR";

  if (opts.hasApprovalSignal || opts.hasToolParts) return "SCOUT";

  const normalized = opts.text.toLowerCase();
  if (
    normalized.includes("initiating") ||
    normalized.includes("understood") ||
    normalized.includes("routing mission")
  ) {
    return "SUPERVISOR";
  }

  return "AUDITOR";
}

function mapMetadataNode(
  raw: unknown,
): AgentType | null {
  if (raw === "supervisor") return "SUPERVISOR";
  if (raw === "scout") return "SCOUT";
  if (raw === "auditor") return "AUDITOR";
  return null;
}

/** Prefer `message.metadata.agent_node` from backend; heuristics only as fallback. */
export function resolveDashboardAgentType(message: DashboardMessage): AgentType | null {
  if (message.role === "user") return null;

  const fromMeta = mapMetadataNode(message.metadata?.agent_node);
  if (fromMeta) return fromMeta;

  const text = renderMessageText(message);
  const toolParts = message.parts.filter(isToolUIPart) as ToolPart[];
  const approvalContext = getApprovalContextFromMessage(message);
  const hasToolApprovalPart = toolParts.some(
    (part) => part.state === "approval-requested",
  );
  const hasStateApprovalSignal =
    !hasToolApprovalPart && messageHasApprovalSignal(message);

  return resolveAssistantAgentTypeHeuristic({
    text,
    hasToolParts: toolParts.length > 0,
    hasApprovalSignal: hasToolApprovalPart || hasStateApprovalSignal,
    requestedByNode: approvalContext?.requested_by_node,
  });
}
