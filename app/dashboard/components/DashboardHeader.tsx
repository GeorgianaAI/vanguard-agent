import Link from "next/link";
import {
  Satellite,
  Activity,
  ChevronLeft,
  Home,
  LogOut,
  Power,
} from "lucide-react";
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
    <header className="mx-auto mb-12 max-w-4xl border-b border-slate-800 pb-10">
      <div className="mb-20 flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase text-slate-400 transition-all hover:border-cyan-500/50 hover:bg-slate-900 hover:text-cyan-400 shadow-lg shadow-black/40"
        >
          <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
          <span className="flex items-center gap-1.5">
            <Home className="h-3 w-3 opacity-60" />
            Return to Base
          </span>
        </Link>

        <button
          type="button"
          onClick={onLogout}
          disabled={logoutPending}
          className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase text-slate-400 transition-all hover:border-rose-900/50 hover:bg-rose-950/20 hover:text-rose-400 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Power className="h-3 w-3 opacity-40 transition-opacity group-hover:opacity-100 group-hover:text-rose-500" />
          <span>
            {logoutPending ? "Terminating mission..." : "Terminate Mission"}
          </span>
          <LogOut className="h-2.5 w-2.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        </button>
      </div>

      <div className="flex items-center justify-between">
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
      </div>
    </header>
  );
}
