import type { DashboardMessage, ToolPart } from "./types";

const APPROVAL_SIGNAL_PREFIX = "AUTHORIZATION_REQUIRED:";

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
    return rawText.replace(APPROVAL_SIGNAL_PREFIX, "").trim();
  }

  return rawText;
}

export function messageHasApprovalSignal(message: DashboardMessage): boolean {
  const lines = message.parts
    .filter((part) => part.type === "text" || part.type === "reasoning")
    .map((part) => part.text ?? "");

  const rawText = lines.join("\n").trim();
  return rawText.startsWith(APPROVAL_SIGNAL_PREFIX);
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
