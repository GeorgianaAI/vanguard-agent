import type { DashboardMessage, ToolActionHandler } from "../lib/types";
import { EmptyState } from "./EmptyState";
import { MessageBubble } from "./MessageBubble";

type MessageFeedProps = {
  messages: DashboardMessage[];
  error?: Error;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
};

export function MessageFeed({
  messages,
  error,
  onAuthorize,
  onAbort,
}: MessageFeedProps) {
  return (
    <div className="custom-scrollbar h-[520px] space-y-4 overflow-y-auto rounded-lg border border-slate-800 bg-black p-6 shadow-2xl">
      {messages.length === 0 && <EmptyState />}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onAuthorize={onAuthorize}
          onAbort={onAbort}
        />
      ))}

      {error && (
        <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          Uplink error: {error.message}
        </div>
      )}
    </div>
  );
}
