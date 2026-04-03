import { Terminal } from "lucide-react";

/** Idle deck: use when a tactical surface has zero rows (not an error). */
export function TerminalIdleEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/40 bg-slate-900/10 py-24">
      <Terminal className="mb-4 h-6 w-6 text-slate-700" />
      <div className="px-6 text-center">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
          Terminal Status: Idle
        </h3>
        <p className="mt-2 max-w-[280px] text-[9px] font-bold uppercase tracking-widest leading-relaxed text-slate-600">
          No active findings detected. Initialize a Vanguard Scout mission to
          populate findings.
        </p>
      </div>
    </div>
  );
}
