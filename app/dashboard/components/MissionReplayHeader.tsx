import { Info, Play, RotateCcw } from "lucide-react";
import type { MissionSurfaceMode } from "../hooks/useVanguardChat";

interface MissionReplayHeaderProps {
  totalSteps: number;
  currentStep: number;
  mode: MissionSurfaceMode;
  onSeekStart: () => void;
  onSeekEnd: () => void;
  seekDisabled: boolean;
}

export function MissionReplayHeader({
  totalSteps,
  currentStep,
  mode,
  onSeekStart,
  onSeekEnd,
  seekDisabled,
}: MissionReplayHeaderProps) {
  const progressPercent =
    totalSteps > 0 ? Math.min((currentStep / totalSteps) * 100, 100) : 0;

  const modeLabel =
    mode === "restored" ? "RESTORED TRANSCRIPT" : "LIVE MISSION";
  const modeDetail =
    mode === "restored"
      ? "Read-only seek — use New Mission to start fresh"
      : "Interactive — operator messages & approvals enabled";

  return (
    <div className="sticky top-0 z-20 mb-3 flex w-full min-w-0 flex-col gap-3 rounded-lg border border-slate-800/80 bg-slate-950 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <div className="flex min-w-0 shrink items-center gap-2 sm:gap-4">
        <div
          className={`flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 ${
            mode === "restored"
              ? "border-indigo-500/30 bg-indigo-950/40"
              : "border-cyan-500/25 bg-cyan-950/25"
          }`}
        >
          <Info
            className={`h-3 w-3 shrink-0 ${mode === "restored" ? "text-indigo-400" : "text-cyan-400"}`}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className={`truncate text-[10px] font-black tracking-widest uppercase ${mode === "restored" ? "text-indigo-200" : "text-cyan-200"}`}
            >
              {modeLabel}
            </span>
            <span className="hidden text-[8px] font-bold uppercase tracking-tight text-slate-500 sm:block">
              {modeDetail}
            </span>
          </span>
        </div>
      </div>

      {/* 🛰️ PLAYBACK CONTROLS — seek within current transcript (no agent re-run) */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:max-w-[200px] sm:flex-none sm:justify-end md:max-w-none">
        <button
          type="button"
          disabled={seekDisabled || totalSteps === 0}
          onClick={onSeekStart}
          className="shrink-0 text-slate-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Jump to first timeline event"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <div className="h-1 min-w-0 max-w-[140px] flex-1 rounded-full bg-slate-800 overflow-hidden sm:max-w-[128px] md:w-32 md:max-w-none md:flex-none">
          <div
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <button
          type="button"
          disabled={seekDisabled || totalSteps === 0}
          onClick={onSeekEnd}
          className="shrink-0 text-slate-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Jump to last timeline event"
        >
          <Play className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 text-center text-[10px] font-bold text-slate-500 tabular-nums uppercase tracking-widest sm:text-right">
        Step {currentStep} / {totalSteps}
      </div>
    </div>
  );
}
