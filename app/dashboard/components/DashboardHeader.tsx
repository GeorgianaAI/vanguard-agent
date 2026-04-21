import { Activity, Satellite } from "lucide-react";
import { STATUS_RECON_IN_PROGRESS, STATUS_SATELLITE_IDLE } from "../lib/constants";
import { GovernanceLedgerButton } from "./GovernanceLedgerButton";
import { ResetMissionButton } from "./ResetMissionButton";
import { ReturnToBaseButton } from "./ReturnToBaseButton";
import { TerminateMissionButton } from "./TerminateMissionButton";

type DashboardHeaderProps = {
  loading: boolean;
  /** Read-only restored transcript (affects satellite pulse only). */
  restored: boolean;
  /** Amber + RECON IN PROGRESS while streaming or live HITL wait; green idle otherwise. */
  reconLedActive: boolean;
  onLogout: () => void;
  logoutPending: boolean;
  onResetMission: () => void;
};

export function DashboardHeader({
  loading,
  restored,
  reconLedActive,
  onLogout,
  logoutPending,
  onResetMission,
}: DashboardHeaderProps) {
  const linkLive = !restored;
  const statusLabel = reconLedActive ? STATUS_RECON_IN_PROGRESS : STATUS_SATELLITE_IDLE;

  return (
    <header className="mb-12 w-full pt-6">
      {/* Row 1: Full-width divider row */}
      <div className="mb-20 border-b border-slate-800/60 pb-4">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-12">
          {/* Edge-synced navigation controls */}
          <ReturnToBaseButton />

          <GovernanceLedgerButton />

          <ResetMissionButton onReset={onResetMission} />

          <TerminateMissionButton
            disabled={logoutPending}
            pending={logoutPending}
            onClick={onLogout}
          />
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-6 md:px-8">
        <div className="flex items-start gap-5">
          <Satellite
            className={`h-12 w-12 text-cyan-500 mt-[-4px] ${loading && linkLive ? "animate-pulse" : ""}`}
          />
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase sm:text-4xl">
              VANGUARD COMMAND CENTER <span className="text-cyan-500">🛰️</span>
            </h1>
            <div className="flex items-center gap-2 text-[12px] text-cyan-400 font-bold tracking-[0.25em] uppercase opacity-90">
              <Activity className="w-3.5 h-3.5" /> Autonomous Reconnaissance Terminal
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-2.5 text-[11px] font-black tracking-widest uppercase shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full shrink-0 -translate-y-[2.5px] ${reconLedActive ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`}
            />
            <span className="text-slate-300">{statusLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
