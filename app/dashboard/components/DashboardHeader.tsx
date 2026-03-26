import { Satellite, Activity } from "lucide-react";
import {
  STATUS_RECON_IN_PROGRESS,
  STATUS_SATELLITE_IDLE,
} from "../lib/constants";

type DashboardHeaderProps = {
  loading: boolean;
};

export function DashboardHeader({ loading }: DashboardHeaderProps) {
  return (
    <header className="mx-auto mb-12 flex max-w-4xl items-center justify-between border-b border-slate-800 pb-10">
      <div className="flex items-center gap-5">
        <Satellite
          className={`h-12 w-12 text-cyan-500 ${loading ? "animate-pulse" : ""}`}
        />
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-white leading-none mb-2">
            VANGUARD COMMAND <span className="text-cyan-500">🛰️</span>
          </h1>
          <div className="flex items-center gap-2 text-[11px] text-cyan-400 font-bold tracking-[0.25em] uppercase opacity-90">
            <Activity className="w-3.5 h-3.5" /> Agentic AI: Phase 2 Operational
            Autonomy
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-2.5 text-[11px] font-black tracking-widest uppercase shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${loading ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`}
          />
          <span className="text-slate-300">
            {loading ? STATUS_RECON_IN_PROGRESS : STATUS_SATELLITE_IDLE}
          </span>
        </div>
      </div>
    </header>
  );
}
