import { Satellite } from "lucide-react";
import {
  STATUS_RECON_IN_PROGRESS,
  STATUS_SATELLITE_IDLE,
} from "../lib/constants";

type DashboardHeaderProps = {
  loading: boolean;
};

export function DashboardHeader({ loading }: DashboardHeaderProps) {
  return (
    <header className="mx-auto mb-8 flex max-w-4xl items-center justify-between border-b border-slate-800 pb-6">
      <div className="flex items-center gap-3">
        <Satellite
          className={`h-8 w-8 text-cyan-400 ${loading ? "animate-pulse" : ""}`}
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tighter">
            VANGUARD AGENT
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-300">
            Autonomous Security Scout
          </p>
        </div>
      </div>

      <div className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-[10px]">
        {loading ? STATUS_RECON_IN_PROGRESS : STATUS_SATELLITE_IDLE}
      </div>
    </header>
  );
}
