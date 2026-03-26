import type { UIMessage } from "ai";

export type DashboardMessage = UIMessage;

export type ToolPart = Extract<
  UIMessage["parts"][number],
  { state: string; toolCallId: string }
>;

export type ToolActionHandler = (part: ToolPart) => Promise<void>;
