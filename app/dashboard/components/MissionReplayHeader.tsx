import { Play, RotateCcw } from "lucide-react";
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

  return (
    <div className="sticky top-0 z-20 mb-3 flex w-full min-w-0 flex-col gap-3 rounded-lg border border-slate-800/80 bg-slate-950 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
      {/* Mode status (LED + dual-line label) */}
      <div className="flex min-w-0 shrink-0 items-center">
        <div
          className={`flex items-center gap-3 rounded-lg border px-3 py-1.5 backdrop-blur-md transition-all duration-500 ${
            mode === "restored"
              ? "border-indigo-500/40 bg-indigo-950/30 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]"
              : "border-cyan-500/40 bg-cyan-950/30 shadow-[0_0_15px_-5px_rgba(8,145,178,0.2)]"
          }`}
        >
          <div
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              mode === "restored"
                ? "bg-indigo-400"
                : "animate-pulse bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
            }`}
            aria-hidden
          />

          <div className="flex min-w-0 flex-col leading-none">
            <span
              className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                mode === "restored" ? "text-indigo-300" : "text-cyan-300"
              }`}
            >
              {mode === "restored" ? "Restored Session" : "Live Mission"}
            </span>

            <span className="mt-1 text-[8px] font-bold uppercase tracking-widest text-slate-500">
              {mode === "restored"
                ? "Read-Only Transcript"
                : "Interactive Protocol Enabled"}
            </span>
          </div>
        </div>
      </div>

      {/* Seek controls */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <button
          type="button"
          disabled={seekDisabled || totalSteps === 0}
          onClick={onSeekStart}
          className="shrink-0 text-slate-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Jump to first timeline event"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <div className="h-1 min-w-0 max-w-[140px] flex-1 rounded-full bg-slate-800 overflow-hidden sm:max-w-[160px] md:max-w-[200px]">
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

      <div className="shrink-0 pl-1 text-center text-[10px] font-bold tabular-nums uppercase tracking-widest text-slate-500 sm:text-right sm:pl-2">
        Step {currentStep} / {totalSteps}
      </div>
    </div>
  );
}
