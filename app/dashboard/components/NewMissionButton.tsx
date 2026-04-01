import { Plus, RefreshCw } from "lucide-react";

type NewMissionButtonProps = {
  onReset: () => void;
};

export function NewMissionButton({ onReset }: NewMissionButtonProps) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-lg shadow-black/40 transition-all hover:border-cyan-500/50 hover:bg-slate-900 hover:text-cyan-400"
    >
      <RefreshCw className="h-3 w-3 transition-transform duration-500 group-hover:rotate-180" />
      <span>New Mission</span>
      <Plus className="h-2.5 w-2.5 opacity-0 transition-all group-hover:opacity-100" />
    </button>
  );
}
