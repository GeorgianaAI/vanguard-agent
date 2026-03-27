import { isToolUIPart } from "ai";
import { NON_TEXT_EVENT_TEXT } from "../lib/constants";
import type {
  DashboardMessage,
  ToolActionHandler,
  ToolPart,
} from "../lib/types";
import { messageHasApprovalSignal, renderMessageText } from "../lib/utils";
import { ApprovalCard } from "./ApprovalCard";
import { ToolInvocationCard } from "./ToolInvocationCard";

type MessageBubbleProps = {
  message: DashboardMessage;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
  resolved?: boolean;
};

export function MessageBubble({
  message,
  onAuthorize,
  onAbort,
  resolved = false,
}: MessageBubbleProps) {
  const text = renderMessageText(message);
  const toolParts = message.parts.filter(isToolUIPart) as ToolPart[];
  const isUser = message.role === "user";

  const hasToolApprovalPart = toolParts.some(
    (part) => part.state === "approval-requested",
  );

  // SCOUT token is safe as fallback now — interruptBefore:["scout"] guarantees
  // supervisor runs exactly once per mission, so this only fires once.
  const hasStateApprovalSignal =
    !isUser &&
    !hasToolApprovalPart &&
    (messageHasApprovalSignal(message) ||
      text.trim().toUpperCase() === "SCOUT");

  const showApprovalCard =
    !resolved && (hasToolApprovalPart || hasStateApprovalSignal);

  const fallbackApprovalPart = {
    type: "tool-invocation",
    state: "approval-requested",
    toolCallId: "manual-authorization",
  } as unknown as ToolPart;

  return (
    <div className="group animate-in fade-in slide-in-from-left-2 duration-300 space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={`text-[9px] font-black px-2 py-0.5 rounded tracking-[0.15em] uppercase shadow-sm border transition-colors ${isUser
            ? "bg-slate-800 text-slate-400 border-slate-700"
            : "bg-cyan-950 text-cyan-400 border-cyan-500/10"
            }`}
        >
          {isUser ? "Operator" : "Vanguard"}
        </span>
      </div>

      <div className="text-[13px] text-slate-300 font-medium leading-relaxed pl-4 border-l-2 border-slate-800 transition-colors group-hover:border-slate-700 whitespace-pre-wrap">
        {text || (
          <span className="italic text-slate-600 tracking-tight">
            {NON_TEXT_EVENT_TEXT}
          </span>
        )}
      </div>

      {toolParts.length > 0 && (
        <div className="pl-4 space-y-3">
          {toolParts.map((part, index) => (
            <ToolInvocationCard
              key={`${message.id}-${part.toolCallId}-${index}`}
              part={part}
              onAuthorize={onAuthorize}
              onAbort={onAbort}
            />
          ))}
        </div>
      )}

      {showApprovalCard && (
        <div className="pl-4">
          <ApprovalCard
            part={hasToolApprovalPart ? toolParts[0] : fallbackApprovalPart}
            onAuthorize={onAuthorize}
            onAbort={onAbort}
          />
        </div>
      )}
    </div>
  );
}
