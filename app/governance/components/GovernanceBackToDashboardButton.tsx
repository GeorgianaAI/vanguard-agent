import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function GovernanceBackToDashboardButton() {
  return (
    <div className="mb-12 flex flex-wrap items-center gap-3">
      <Link
        href="/dashboard"
        data-testid="governance-back-dashboard"
        className="group inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 shadow-lg shadow-black/40 transition-all hover:border-cyan-500/50 hover:bg-slate-900 hover:text-cyan-400 focus:outline-none"
      >
        <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        <span className="leading-none">Back to Command Center</span>
      </Link>
    </div>
  );
}
