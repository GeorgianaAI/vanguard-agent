import type {
  DashboardMessage,
  MissionTimelineEvent,
  TimelineNode,
} from "./types";
import { getApprovalContextFromMessage } from "./utils";
import { isToolUIPart } from "ai";

function textFromMessage(message: DashboardMessage): string {
  return message.parts
    .filter((part) => part.type === "text" || part.type === "reasoning")
    .map((part) => part.text ?? "")
    .join("\n")
    .toLowerCase()
    .trim();
}

function formatStep(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function nodeFromMetadata(message: DashboardMessage): TimelineNode | null {
  const raw = message.metadata?.agent_node;
  if (raw === "supervisor") return "SUPERVISOR";
  if (raw === "scout") return "SCOUT";
  if (raw === "auditor") return "AUDITOR";
  return null;
}

function fallbackNodeFromHeuristics(text: string, hasToolParts: boolean): TimelineNode {
  if (
    text.includes("final") ||
    text.includes("summary") ||
    text.includes("findings")
  ) {
    return "AUDITOR";
  }
  if (hasToolParts) return "SCOUT";
  return "SCOUT";
}

function labelForMessage(
  message: DashboardMessage,
  text: string,
): { label: string; node: TimelineNode } {
  if (message.role === "user") {
    if (text.includes("mission authorized")) {
      return { label: "Authorized by Operator", node: "OPERATOR" };
    }
    if (text.includes("mission aborted")) {
      return { label: "Aborted by Operator", node: "OPERATOR" };
    }
    return { label: "Mission Prompt Submitted", node: "OPERATOR" };
  }

  const approvalContext = getApprovalContextFromMessage(message);
  if (approvalContext) {
    return {
      label: "Approval Requested",
      node: nodeFromMetadata(message) ?? "SCOUT",
    };
  }

  const toolParts = message.parts.filter(isToolUIPart);
  if (toolParts.length > 0) {
    return { label: "Tool Execution", node: nodeFromMetadata(message) ?? "SCOUT" };
  }

  const metadataNode = nodeFromMetadata(message);
  if (metadataNode === "AUDITOR") {
    return { label: "Final Auditor Summary", node: "AUDITOR" };
  }
  if (metadataNode === "SUPERVISOR") {
    return { label: "Supervisor Routing", node: "SUPERVISOR" };
  }
  if (metadataNode === "SCOUT") {
    return { label: "Scout Response", node: "SCOUT" };
  }

  const fallbackNode = fallbackNodeFromHeuristics(text, toolParts.length > 0);
  if (fallbackNode === "AUDITOR") {
    return { label: "Final Auditor Summary", node: "AUDITOR" };
  }

  return { label: "Agent Response", node: fallbackNode };
}

export function buildMissionTimelineEvents(
  messages: DashboardMessage[],
  activeMessageId: string | null,
): MissionTimelineEvent[] {
  return messages.map((message, index) => {
    const text = textFromMessage(message);
    const { label, node } = labelForMessage(message, text);

    return {
      id: `${message.id}-${index}`,
      messageId: message.id,
      messageIndex: index,
      timestamp: formatStep(index),
      label,
      node,
      status:
        activeMessageId === message.id
          ? "active"
          : activeMessageId
            ? "completed"
            : index === messages.length - 1
              ? "active"
              : "completed",
    };
  });
}
