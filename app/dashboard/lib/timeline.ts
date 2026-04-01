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
    return { label: "Approval Requested", node: "SCOUT" };
  }

  const toolParts = message.parts.filter(isToolUIPart);
  if (toolParts.length > 0) {
    return { label: "Tool Execution", node: "SCOUT" };
  }

  if (
    text.includes("final") ||
    text.includes("summary") ||
    text.includes("findings")
  ) {
    return { label: "Final Auditor Summary", node: "AUDITOR" };
  }

  return { label: "Agent Response", node: "SCOUT" };
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
