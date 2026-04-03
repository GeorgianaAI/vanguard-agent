"use client";

import { useGovernanceData } from "../hooks/useGovernanceData";

/** Explains standby / insufficient mission-linked telemetry — under Evidence Trail only. */
export function GovernanceStatusBrief() {
  const { model } = useGovernanceData();

  if (model.source === "derived") return null;

  return (
    <div
      data-testid="governance-status-brief"
      className="px-2 animate-in fade-in slide-in-from-bottom-2 duration-700"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-slate-600" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          System Status: Standby
        </span>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-tight leading-relaxed text-slate-600 italic">
        Insufficient mission telemetry for risk scoring. Complete an{" "}
        <span className="text-slate-500">authorized Vanguard mission</span> from
        Command Center to calibrate the integrity ledger and compute a trust score.
      </p>
    </div>
  );
}
