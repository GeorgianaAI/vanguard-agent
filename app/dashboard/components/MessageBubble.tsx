import { isToolUIPart } from "ai";
import { NON_TEXT_EVENT_TEXT } from "../lib/constants";
import type {
  DashboardMessage,
  ToolActionHandler,
  ToolPart,
} from "../lib/types";
import {
  getApprovalContextFromMessage,
  messageHasApprovalSignal,
  renderMessageText,
} from "../lib/utils";
import type { ApprovalContextV1 } from "@/src/lib/approval/types";
import { ApprovalCard } from "./ApprovalCard";
import { ToolInvocationCard } from "./ToolInvocationCard";
import { AgentBadge, type AgentType } from "./AgentBadge";

type MessageBubbleProps = {
  message: DashboardMessage;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
  resolved?: boolean;
  approvalDisabled?: boolean;
  previousApprovalContext?: ApprovalContextV1 | null;
};

function resolveAssistantAgentType(opts: {
  text: string;
  hasToolParts: boolean;
  hasApprovalSignal: boolean;
  requestedByNode?: "supervisor" | "scout" | "system";
}): AgentType {
  // Strongest signal: explicit node in approval context
  if (opts.requestedByNode === "scout") return "SCOUT";
  if (opts.requestedByNode === "supervisor") return "SUPERVISOR";

  // Approval gate and tool activity are scout-origin in current graph
  if (opts.hasApprovalSignal || opts.hasToolParts) return "SCOUT";

  // Lightweight supervisor cue for initial routing acknowledgements
  const normalized = opts.text.toLowerCase();
  if (
    normalized.includes("initiating") ||
    normalized.includes("understood") ||
    normalized.includes("routing mission")
  ) {
    return "SUPERVISOR";
  }

  // Final synthesis/closure falls to auditor
  return "AUDITOR";
}

export function MessageBubble({
  message,
  onAuthorize,
  onAbort,
  resolved = false,
  approvalDisabled = false,
  previousApprovalContext = null,
}: MessageBubbleProps) {
  const text = renderMessageText(message);
  const toolParts = message.parts.filter(isToolUIPart) as ToolPart[];
  const isUser = message.role === "user";
  const approvalContext = getApprovalContextFromMessage(message);

  const hasToolApprovalPart = toolParts.some(
    (part) => part.state === "approval-requested",
  );

  // Keep fallback deterministic: only the explicit approval signal can trigger
  // fallback rendering if adapter tool state is unavailable.
  const hasStateApprovalSignal =
    !isUser && !hasToolApprovalPart && messageHasApprovalSignal(message);

  const showApprovalCard =
    !resolved && (hasToolApprovalPart || hasStateApprovalSignal);

  const fallbackApprovalPart = {
    type: "tool-invocation",
    state: "approval-requested",
    toolCallId: approvalContext?.approval_id ?? "manual-authorization",
    input: {
      approval_id: approvalContext?.approval_id,
      approval_context_hash: approvalContext?.approval_context_hash,
      approval_context: approvalContext,
      query: approvalContext?.summary,
    },
  } as unknown as ToolPart;

  const agentType: AgentType | null = isUser
    ? null
    : resolveAssistantAgentType({
        text,
        hasToolParts: toolParts.length > 0,
        hasApprovalSignal: hasToolApprovalPart || hasStateApprovalSignal,
        requestedByNode: approvalContext?.requested_by_node,
      });

  return (
    <div className="group animate-in fade-in slide-in-from-left-2 duration-300 space-y-4">
      <div className="flex items-center gap-2">
        {isUser ? (
          <span className="text-[9px] font-black px-2 py-0.5 rounded tracking-[0.15em] uppercase shadow-sm border transition-colors bg-slate-800 text-slate-400 border-slate-700">
            Operator
          </span>
        ) : (
          <AgentBadge type={agentType ?? "AUDITOR"} />
        )}
      </div>

      <div className="text-[13px] text-slate-300 font-medium leading-relaxed pl-4 border-l-2 border-slate-800 transition-colors group-hover:border-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
            disabled={approvalDisabled}
            previousApprovalContext={previousApprovalContext}
          />
        </div>
      )}
    </div>
  );
}
