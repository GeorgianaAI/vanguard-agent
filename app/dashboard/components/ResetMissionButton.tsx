import { ArrowLeftToLine, RefreshCw } from "lucide-react";

type ResetMissionButtonProps = {
  onReset: () => void;
};

export function ResetMissionButton({ onReset }: ResetMissionButtonProps) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-slate-400 transition-all hover:border-emerald-500/50 hover:bg-slate-900 hover:text-emerald-400 shadow-lg shadow-black/40 active:scale-95 focus:outline-none"
    >
      {/* 🛰️ LEFT ICON: The Process (Refresh) */}
      <RefreshCw className="h-3.5 w-3.5 shrink-0 opacity-40 transition-transform duration-700 group-hover:rotate-180 group-hover:opacity-100" />

      <div className="flex flex-col items-start gap-1 leading-none">
        <span className="text-[10px] font-black uppercase tracking-widest">
          Reset Mission
        </span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
          Wipe History & Restart
        </span>
      </div>

      {/* 🛰️ RIGHT ICON: The Destination (Back to Start) */}
      <ArrowLeftToLine className="h-2.5 w-2.5 shrink-0 opacity-40 transition-all group-hover:-translate-x-0.5 group-hover:opacity-100" />
    </button>
  );
}
