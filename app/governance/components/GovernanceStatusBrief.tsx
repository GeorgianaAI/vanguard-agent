"use client";

import { ShieldAlert } from "lucide-react";
import { useGovernanceData } from "../hooks/useGovernanceData";

/** 🛰️ MISSION STATUS BRIEFING: Rendered in the Evidence Rail when telemetry is absent. */
export function GovernanceStatusBrief() {
  const { model, loadPhase } = useGovernanceData();

  if (loadPhase === "synchronizing") return null;

  // If data is derived (present), the brief is suppressed.
  if (model.source === "derived") return null;

  return (
    <div
      data-testid="governance-status-brief"
      className="mt-10 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-8 text-center shadow-2xl backdrop-blur-xl transition-all duration-700 animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="mb-6 flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-full w-full rounded-full bg-blue-500/20 blur-md animate-pulse" />
          <ShieldAlert className="relative h-6 w-6 text-blue-400" aria-hidden />
        </div>

        <span className="text-[13px] font-black uppercase tracking-[0.3em] text-blue-400">
          Insufficient Mission Telemetry
        </span>
      </div>

      <p className="mx-auto max-w-md text-[12px] font-black uppercase tracking-[0.2em] leading-relaxed text-slate-600">
        Initialize an authorized Vanguard Scout mission from the Command Center to synchronize
        telemetry and compute an active trust score
      </p>
    </div>
  );
}
