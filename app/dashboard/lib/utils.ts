import type { DashboardMessage, ToolPart } from "./types";

export function isLoadingStatus(status: string): boolean {
  return status === "submitted" || status === "streaming";
}

export function renderMessageText(message: DashboardMessage): string {
  const lines = message.parts
    .filter((part) => part.type === "text" || part.type === "reasoning")
    .map((part) => part.text);

  return lines.join("\n").trim();
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
