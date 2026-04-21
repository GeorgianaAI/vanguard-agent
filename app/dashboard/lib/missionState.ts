import type { DashboardMessage } from "./types";

export function extractMissionMessageText(message: DashboardMessage): string {
  return message.parts
    .filter((part) => part.type === "text" || part.type === "reasoning")
    .map((part) => (part.text ?? "").toLowerCase())
    .join("\n");
}

export function hasOpenApproval(messages: DashboardMessage[]): boolean {
  const latestApprovalIndex = messages.findLastIndex((message) => {
    if (message.role !== "assistant") return false;
    const text = extractMissionMessageText(message);
    const hasApprovalSignal = text.includes("authorization_required:");
    const hasApprovalPart = message.parts.some(
      (part) =>
        part.type === "tool-invocation" && "state" in part && part.state === "approval-requested",
    );
    return hasApprovalSignal || hasApprovalPart;
  });

  if (latestApprovalIndex < 0) return false;

  return !messages.slice(latestApprovalIndex + 1).some((message) => {
    if (message.role !== "user") return false;
    const text = extractMissionMessageText(message);
    return text.includes("mission authorized") || text.includes("mission aborted");
  });
}

export function shouldStartFreshMission(messages: DashboardMessage[]): boolean {
  if (messages.length === 0) return false;
  if (hasOpenApproval(messages)) return false;
  return true;
}
