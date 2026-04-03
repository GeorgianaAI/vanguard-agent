"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";

import { useGovernanceData } from "../hooks/useGovernanceData";

export function AdvisorySignals() {
  const { model } = useGovernanceData();
  const advisories = model.advisorySignals;

  return (
    <div
      data-testid="governance-advisory-signals"
      className="w-full min-w-0 max-w-full rounded-2xl border border-amber-900/30 bg-amber-950/5 p-6 pb-8 backdrop-blur-xl md:p-8"
    >
      <div className="mb-6 flex flex-col gap-2 border-b border-amber-900/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <h2 className="text-sm font-black tracking-widest uppercase text-amber-200">
            Advisory Signals
          </h2>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          Enriched via OSINT Scope
        </span>
      </div>

      <div className="grid min-w-0 gap-4">
        {advisories.map((cve) => (
          <div
            key={cve.id}
            data-testid={`governance-advisory-${cve.id}`}
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-all hover:border-amber-500/30"
          >
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <span className="font-mono text-xs font-black text-amber-500">
                  {cve.id}
                </span>
                <span className="border-l border-slate-700 pl-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {cve.stack}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-black text-rose-500">
                  {cve.severity}
                </span>
                <span className="text-[10px] font-bold tabular-nums text-slate-500">
                  CVSS {cve.cvss}
                </span>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words italic">
                Scout detected matching version string in target response
                headers.
              </p>
              <button
                type="button"
                data-testid="governance-audit-evidence-placeholder"
                className="inline-flex shrink-0 cursor-default items-center gap-1 font-black uppercase tracking-tighter text-slate-500"
                disabled
                aria-disabled="true"
              >
                Audit Evidence <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </button>
            </div>
            <p className="min-w-0 break-words text-[10px] italic text-slate-500">
              {cve.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
