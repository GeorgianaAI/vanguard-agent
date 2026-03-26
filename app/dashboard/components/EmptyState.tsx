import { Terminal } from "lucide-react";
import { EMPTY_FEED_TEXT } from "../lib/constants";

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-slate-500 opacity-50">
      <Terminal className="mb-4 h-12 w-12" />
      <p>{EMPTY_FEED_TEXT}</p>
    </div>
  );
}
