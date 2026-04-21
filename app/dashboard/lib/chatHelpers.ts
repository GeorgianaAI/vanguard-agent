import type { ToolPart } from "./types";
import type { ApprovalContextV1 } from "@/src/lib/approval/types";
import { getThreadPrefix } from "@/src/lib/runtime/redteam";

/** Must match localStorage key in dashboard session persistence. */
export const THREAD_STORAGE_KEY = "vanguard-thread-id";

export function createThreadId(): string {
  const prefix = getThreadPrefix();
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

export function getToolCallId(part: ToolPart): string | null {
  if (!part || typeof part !== "object") return null;
  if (!("toolCallId" in part)) return null;
  const value = part.toolCallId;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export type ApprovalPayloadFromPart = {
  approvalId: string | null;
  approvalContextHash: string | null;
  approvalContext: ApprovalContextV1 | null;
};

export function getApprovalPayloadFromPart(part: ToolPart): ApprovalPayloadFromPart {
  if (!("input" in part) || typeof part.input !== "object" || !part.input) {
    return {
      approvalId: null,
      approvalContextHash: null,
      approvalContext: null,
    };
  }
  const input = part.input as Record<string, unknown>;
  const approvalId = typeof input.approval_id === "string" ? input.approval_id : null;
  const approvalContextHash =
    typeof input.approval_context_hash === "string" ? input.approval_context_hash : null;
  const approvalContext =
    input.approval_context &&
    typeof input.approval_context === "object" &&
    (input.approval_context as { version?: unknown }).version === 1
      ? (input.approval_context as ApprovalContextV1)
      : null;
  return {
    approvalId,
    approvalContextHash,
    approvalContext,
  };
}
