import { Play, RotateCcw, Info } from "lucide-react";

interface MissionReplayHeaderProps {
  totalSteps: number; // The total count of events in the log
  currentStep: number; // The current active index in the playback
}

export function MissionReplayHeader({
  totalSteps,
  currentStep,
}: MissionReplayHeaderProps) {
  // Logic to prevent division by zero or negative widths
  const progressPercent =
    totalSteps > 0 ? Math.min((currentStep / totalSteps) * 100, 100) : 0;

  return (
    <div className="sticky top-0 z-20 flex w-full min-w-0 flex-col gap-3 border-b border-slate-800 bg-slate-950 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <div className="flex min-w-0 shrink items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-indigo-500/30 bg-indigo-950/40 px-2 py-1">
          <Info className="h-3 w-3 shrink-0 text-indigo-400" />
          <span className="truncate text-[10px] font-black tracking-widest text-indigo-300 uppercase">
            REPLAY MODE: READ-ONLY
          </span>
        </div>
      </div>

      {/* 🛰️ PLAYBACK CONTROLS */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:max-w-[200px] sm:flex-none sm:justify-end md:max-w-none">
        <button
          type="button"
          className="shrink-0 text-slate-500 transition-colors hover:text-white"
          aria-label="Jump to start"
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
          className="shrink-0 text-slate-500 transition-colors hover:text-white"
          aria-label="Jump to end"
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
