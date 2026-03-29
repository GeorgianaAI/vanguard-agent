import type { ToolPart } from "./types";

/** Must match localStorage key in dashboard session persistence. */
export const THREAD_STORAGE_KEY = "vanguard-thread-id";

export function createThreadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `vanguard-${crypto.randomUUID()}`;
  }
  return `vanguard-${Date.now()}`;
}

export function getToolCallId(part: ToolPart): string | null {
  if (!part || typeof part !== "object") return null;
  if (!("toolCallId" in part)) return null;
  const value = part.toolCallId;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
