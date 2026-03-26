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
    <div className="custom-scrollbar h-[520px] space-y-6 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/30 p-8 shadow-2xl relative">
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
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-[10px] font-black tracking-widest uppercase text-red-400">
          Uplink error: {error.message}
        </div>
      )}
    </div>
  );
}
