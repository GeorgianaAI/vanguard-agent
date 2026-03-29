import { z } from "zod";

export const IncomingMessageSchema = z.looseObject({
  role: z.string().optional(),
  content: z.unknown().optional(),
  parts: z.array(z.unknown()).optional(),
});

export const MissionRequestSchema = z.object({
  messages: z.array(IncomingMessageSchema).optional().default([]),
  target: z.string().optional(),
  thread_id: z.string().optional(),
  isApproval: z.boolean().optional().default(false),
  approved: z.boolean().optional(),
  tool_call_id: z.string().optional(),
});

export type MissionRequestInput = z.infer<typeof MissionRequestSchema>;

export function extractTextFromMessage(
  message: z.infer<typeof IncomingMessageSchema>,
): string {
  if (typeof message.content === "string") return message.content.trim();

  if (Array.isArray(message.content)) {
    const fromContent = message.content
      .map((part) => {
        if (
          part &&
          typeof part === "object" &&
          "type" in part &&
          "text" in part &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fromContent) return fromContent;
  }

  if (Array.isArray(message.parts)) {
    const fromParts = message.parts
      .map((part) => {
        if (
          part &&
          typeof part === "object" &&
          "type" in part &&
          "text" in part &&
          (part as { type?: unknown }).type === "text" &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fromParts) return fromParts;
  }

  return "";
}

/** Pure checks for approval branch (mirrors route invariants). */
export function approvalMissingThreadId(data: MissionRequestInput): boolean {
  return data.isApproval === true && !data.thread_id;
}

export function approvalMissingApprovedFlag(data: MissionRequestInput): boolean {
  return data.isApproval === true && typeof data.approved !== "boolean";
}

/** Redis + in-process approval lock key (must match route.ts usage). */
export function formatApprovalLockKey(
  threadId: string,
  toolCallId: string | undefined,
): string {
  const approvalId = toolCallId?.trim() || "manual-authorization";
  return `vanguard:approval:${threadId}:${approvalId}`;
}
