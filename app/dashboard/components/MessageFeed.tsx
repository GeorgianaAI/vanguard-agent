import type { DashboardMessage, ToolActionHandler } from "../lib/types";
import {
  getApprovalContextFromMessage,
  getMessageSignature,
} from "../lib/utils";
import { EmptyState } from "./EmptyState";
import { MessageBubble } from "./MessageBubble";

type MessageFeedProps = {
  messages: DashboardMessage[];
  error?: Error;
  operatorNotice?: string | null;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
  approvalDisabled?: boolean;
};

function extractMessageText(message: DashboardMessage): string {
  return message.parts
    .filter((part) => part.type === "text" || part.type === "reasoning")
    .map((part) => part.text ?? "")
    .join("\n")
    .toLowerCase();
}

export function MessageFeed({
  messages,
  error,
  operatorNotice,
  onAuthorize,
  onAbort,
  approvalDisabled = false,
}: MessageFeedProps) {
  const dedupedMessages = messages.filter((message, index, all) => {
    if (index === 0) return true;
    const previous = all[index - 1];
    return getMessageSignature(previous) !== getMessageSignature(message);
  });

  return (
    <div className="custom-scrollbar relative h-[520px] space-y-6 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/30 p-8 shadow-2xl">
      {dedupedMessages.length === 0 && <EmptyState />}

      {dedupedMessages.map((message, index) => {
        const hasResolutionAfter = dedupedMessages
          .slice(index + 1)
          .some((m) => {
            if (m.role !== "user") return false;
            const txt = extractMessageText(m);
            return (
              txt.includes("mission authorized") ||
              txt.includes("mission aborted")
            );
          });

        const previousApprovalContext = [...dedupedMessages]
          .slice(0, index)
          .reverse()
          .map((m) => getApprovalContextFromMessage(m))
          .find((ctx) => ctx !== null);

        return (
          <div
            key={`${message.id}-${index}`}
            id={`message-${message.id}`}
            data-message-id={message.id}
          >
            <MessageBubble
              message={message}
              onAuthorize={onAuthorize}
              onAbort={onAbort}
              resolved={hasResolutionAfter}
              approvalDisabled={approvalDisabled}
              previousApprovalContext={previousApprovalContext ?? null}
            />
          </div>
        );
      })}

      {(operatorNotice || error) && (
        <div
          data-testid="operator-notice"
          className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-[10px] font-black uppercase tracking-widest text-red-400"
        >
          {operatorNotice ?? `Uplink error: ${error?.message ?? ""}`}
        </div>
      )}
    </div>
  );
}
