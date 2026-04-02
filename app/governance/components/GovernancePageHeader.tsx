import { Scale } from "lucide-react";

export function GovernancePageHeader() {
  return (
    <header
      data-testid="governance-page-header"
      className="mb-10 flex flex-col gap-6 border-b border-slate-800 pb-8 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-cyan-500">
          <Scale className="h-4 w-4 shrink-0" />
          <span className="text-[12px] font-black tracking-[0.3em] uppercase opacity-80">
            Operational Integrity
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tighter uppercase sm:text-4xl">
          Governance Ledger
        </h1>
        <p className="mt-1 text-[13px] font-medium uppercase tracking-widest text-slate-500">
          NIST AI RMF v1.0 Alignment • Continuous Control Monitoring 🛰️
        </p>
      </div>

      <div className="flex shrink-0 gap-4">
        <div
          data-testid="governance-trust-score"
          className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2 text-right shadow-inner"
        >
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
            System Trust Score
          </p>
          <p className="text-xl font-black text-emerald-400">98.4%</p>
        </div>
      </div>
    </header>
  );
}
