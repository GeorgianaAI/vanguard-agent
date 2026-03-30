import type { DashboardMessage, ToolPart } from "./types";
import type { ApprovalContextV1 } from "@/src/lib/approval/types";

const APPROVAL_SIGNAL_PREFIX = "AUTHORIZATION_REQUIRED:";

export function parseApprovalContextText(
  rawText: string,
): ApprovalContextV1 | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith(APPROVAL_SIGNAL_PREFIX)) return null;
  const payload = trimmed.slice(APPROVAL_SIGNAL_PREFIX.length).trim();
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as ApprovalContextV1;
    if (
      parsed &&
      parsed.version === 1 &&
      typeof parsed.approval_id === "string" &&
      typeof parsed.thread_id === "string" &&
      typeof parsed.summary === "string" &&
      parsed.tool &&
      typeof parsed.tool.name === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function isLoadingStatus(status: string): boolean {
  return status === "submitted" || status === "streaming";
}

export function renderMessageText(message: DashboardMessage): string {
  const lines = message.parts
    .filter((part) => part.type === "text" || part.type === "reasoning")
    .map((part) => part.text ?? "");

  const rawText = lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!rawText) return "";

  if (rawText === "[approval]") {
    return "";
  }

  if (rawText.startsWith(APPROVAL_SIGNAL_PREFIX)) {
    const context = parseApprovalContextText(rawText);
    if (context) {
      return `Manual authorization required: ${context.summary}`;
    }
    return rawText.replace(APPROVAL_SIGNAL_PREFIX, "").trim();
  }

  return rawText;
}

export function extractRenderableText(message: DashboardMessage): string {
  return message.parts
    .filter((part) => part.type === "text" || part.type === "reasoning")
    .map((part) => (part.text ?? "").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getMessageSignature(message: DashboardMessage): string {
  const text = extractRenderableText(message);
  const toolSignature = message.parts
    .filter((part) => part.type === "tool-invocation")
    .map((part) => {
      const toolCallId = "toolCallId" in part ? String(part.toolCallId ?? "") : "";
      const state = "state" in part ? String(part.state ?? "") : "";
      const toolName = "toolName" in part ? String(part.toolName ?? "") : "";
      return `${toolName}:${toolCallId}:${state}`;
    })
    .join("|");

  return `${message.role}::${text}::${toolSignature}`;
}

export function messageHasApprovalSignal(message: DashboardMessage): boolean {
  const rawText = extractRenderableText(message);
  return (
    rawText.startsWith(APPROVAL_SIGNAL_PREFIX) ||
    parseApprovalContextText(rawText) !== null
  );
}

export function getApprovalContextFromMessage(
  message: DashboardMessage,
): ApprovalContextV1 | null {
  return parseApprovalContextText(extractRenderableText(message));
}

export function getToolQuery(part: ToolPart): string {
  if (!("input" in part) || !part.input || typeof part.input !== "object") {
    return "";
  }

  const query = (part.input as Record<string, unknown>).query;
  return typeof query === "string" ? query : "";
}

export function isReconTool(toolName: string): boolean {
  return toolName === "tavily_search" || toolName.includes("tavily");
}

export function isToolExecuting(state: string): boolean {
  return state === "input-streaming" || state === "input-available";
}
