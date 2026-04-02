import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";

export function ReturnToBaseButton() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 transition-all hover:border-cyan-500/50 hover:bg-slate-900 hover:text-cyan-400 shadow-lg shadow-black/40 focus:outline-none"
    >
      <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />

      <span className="flex flex-col items-start gap-1 leading-none">
        <span className="flex items-center gap-1.5">
          <Home className="h-3 w-3 opacity-60" />
          Return to Base
        </span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
          EXIT TERMINAL &amp; UPLINK
        </span>
      </span>
    </Link>
  );
}
