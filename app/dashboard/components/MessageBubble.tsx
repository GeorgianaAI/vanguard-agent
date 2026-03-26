import { isToolUIPart } from "ai";
import { NON_TEXT_EVENT_TEXT } from "../lib/constants";
import type {
  DashboardMessage,
  ToolActionHandler,
  ToolPart,
} from "../lib/types";
import { renderMessageText } from "../lib/utils";
import { ToolInvocationCard } from "./ToolInvocationCard";

type MessageBubbleProps = {
  message: DashboardMessage;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
};

export function MessageBubble({
  message,
  onAuthorize,
  onAbort,
}: MessageBubbleProps) {
  const text = renderMessageText(message);
  const toolParts = message.parts.filter(isToolUIPart) as ToolPart[];

  return (
    <div className={`space-y-3 ${message.role === "user" ? "opacity-80" : ""}`}>
      <div className="flex gap-4">
        <span
          className={`mt-1 h-fit rounded px-2 py-0.5 text-[10px] ${
            message.role === "user"
              ? "bg-slate-800"
              : "bg-cyan-950 text-cyan-300"
          }`}
        >
          {message.role.toUpperCase()}
        </span>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {text || NON_TEXT_EVENT_TEXT}
        </div>
      </div>

      {toolParts.map((part) => (
        <ToolInvocationCard
          key={part.toolCallId}
          part={part}
          onAuthorize={onAuthorize}
          onAbort={onAbort}
        />
      ))}
    </div>
  );
}
