import { Satellite } from "lucide-react";

/** Inline ledger body while mission telemetry is being fetched (avoids false empty-state copy). */
export function GovernanceInlineUplinkSync() {
  return (
    <div
      data-testid="governance-ledger-uplink-sync"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cyan-500/20 bg-slate-950/30 py-16"
    >
      <div className="relative mb-5 flex h-12 w-12 items-center justify-center">
        <div className="absolute h-full w-full animate-ping rounded-full bg-cyan-500/15 opacity-75" />
        <Satellite className="relative h-6 w-6 text-cyan-500" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-500">
        Synchronizing Ledger
      </span>
      <span className="mt-2 max-w-xs text-center text-[9px] font-bold uppercase tracking-widest text-slate-600">
        Fetching mission telemetry from Command session…
      </span>
    </div>
  );
}
