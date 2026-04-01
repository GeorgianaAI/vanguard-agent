import { Info, Plus, RefreshCw } from "lucide-react";
import { RESET_MISSION_TOOLTIP } from "../lib/constants";

type ResetMissionButtonProps = {
  onReset: () => void;
};

export function ResetMissionButton({ onReset }: ResetMissionButtonProps) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onReset}
        className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase text-slate-400 transition-all hover:border-emerald-500/50 hover:bg-slate-900 hover:text-emerald-400 shadow-lg shadow-black/40 active:scale-95 focus:outline-none"
      >
        <RefreshCw className="h-3 w-3 transition-transform duration-500 group-hover:rotate-180" />
        <span>Reset Mission</span>
        <Plus className="h-2.5 w-2.5 opacity-0 transition-all group-hover:opacity-100" />
      </button>
      {/* CSS tooltip on hover/focus. */}
      <span className="group/info relative inline-flex shrink-0 items-center justify-center">
        <span
          tabIndex={0}
          className="inline-flex cursor-help text-slate-600 outline-none transition-colors hover:text-cyan-500 focus-visible:text-cyan-500"
          aria-label={`Help: ${RESET_MISSION_TOOLTIP}`}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </span>

        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-[70] mt-2 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-slate-800 bg-slate-950/95 p-4 text-left text-[11px] leading-relaxed text-slate-300 opacity-0 shadow-2xl backdrop-blur-md transition-opacity duration-200 group-hover/info:opacity-100 group-focus-within/info:opacity-100"
        >
          <strong className="mb-1 block font-black uppercase tracking-widest text-cyan-500/80">
            Reset Protocol
          </strong>
          {RESET_MISSION_TOOLTIP}

          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-800" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-b-slate-950" />
        </span>
      </span>
    </div>
  );
}
