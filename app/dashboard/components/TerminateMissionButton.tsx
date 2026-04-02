import { LogOut, Power } from "lucide-react";

type TerminateMissionButtonProps = {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
};

export function TerminateMissionButton({
  disabled,
  pending,
  onClick,
}: TerminateMissionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 transition-all hover:border-rose-900/50 hover:bg-rose-950/20 hover:text-rose-400 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none"
    >
      <Power className="h-3.5 w-3.5 shrink-0 opacity-40 transition-all group-hover:opacity-100 group-hover:text-rose-500" />

      <div className="flex flex-col items-start gap-1 leading-none">
        <span className="text-[10px] font-black uppercase tracking-widest">
          {pending ? "Terminating mission..." : "Terminate Mission"}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
          LOG OUT
        </span>
      </div>

      <LogOut className="h-2.5 w-2.5 shrink-0 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
    </button>
  );
}
