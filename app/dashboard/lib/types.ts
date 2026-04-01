import type { UIMessage } from "ai";

export type DashboardMessage = UIMessage;

export type ToolPart = Extract<
  UIMessage["parts"][number],
  { state: string; toolCallId: string }
>;

export type ToolActionHandler = (part: ToolPart) => Promise<void>;

export type TimelineNode = "SCOUT" | "AUDITOR" | "OPERATOR";

export type TimelineStatus = "completed" | "active" | "pending";

export type MissionTimelineEvent = {
  id: string;
  messageId: string;
  messageIndex: number;
  timestamp: string;
  label: string;
  node: TimelineNode;
  status: TimelineStatus;
};
