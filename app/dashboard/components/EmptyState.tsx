import { Terminal } from "lucide-react";
import { EMPTY_FEED_TEXT } from "../lib/constants";

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-6">
      <div className="relative">
        <div className="absolute -inset-6 rounded-full bg-cyan-500/5 blur-2xl animate-pulse" />
        <Terminal className="relative h-14 w-14 text-slate-500 shadow-sm" />
      </div>

      <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-500">
        {EMPTY_FEED_TEXT}
      </p>
    </div>
  );
}
