import { Satellite, Activity } from "lucide-react";
import {
  STATUS_RECON_IN_PROGRESS,
  STATUS_SATELLITE_IDLE,
} from "../lib/constants";

type DashboardHeaderProps = {
  loading: boolean;
  onLogout: () => void;
  logoutPending: boolean;
};

export function DashboardHeader({
  loading,
  onLogout,
  logoutPending,
}: DashboardHeaderProps) {
  return (
    <header className="mx-auto mb-12 flex max-w-4xl items-center justify-between border-b border-slate-800 pb-10">
      <div className="flex items-start gap-5">
        <Satellite
          className={`h-12 w-12 text-cyan-500 mt-[-4px] ${loading ? "animate-pulse" : ""}`}
        />
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-white leading-none mb-2">
            VANGUARD COMMAND CENTER <span className="text-cyan-500">🛰️</span>
          </h1>
          <div className="flex items-center gap-2 text-[13px] text-cyan-400 font-bold tracking-[0.25em] uppercase opacity-90">
            <Activity className="w-3.5 h-3.5" /> Autonomous Reconnaissance
            Terminal
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-2.5 text-[11px] font-black tracking-widest uppercase shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full shrink-0 -translate-y-[2.5px] ${loading ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`}
            />
            <span className="text-slate-300">
              {loading ? STATUS_RECON_IN_PROGRESS : STATUS_SATELLITE_IDLE}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {logoutPending ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}
