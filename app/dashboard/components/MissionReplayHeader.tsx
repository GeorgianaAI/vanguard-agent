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
    <div className="sticky top-0 z-20 flex w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 p-3 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-md border border-indigo-500/30 bg-indigo-950/20 px-2 py-1">
          <Info className="h-3 w-3 text-indigo-400" />
          <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">
            REPLAY MODE: READ-ONLY
          </span>
        </div>
      </div>

      {/* 🛰️ PLAYBACK CONTROLS */}
      <div className="flex items-center gap-3">
        <button className="text-slate-500 hover:text-white transition-colors">
          <RotateCcw className="h-4 w-4" />
        </button>
        <div className="h-1 w-32 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <button className="text-slate-500 hover:text-white transition-colors">
          <Play className="h-4 w-4" />
        </button>
      </div>

      <div className="text-[10px] font-bold text-slate-500 tabular-nums uppercase tracking-widest">
        Step {currentStep} / {totalSteps}
      </div>
    </div>
  );
}
