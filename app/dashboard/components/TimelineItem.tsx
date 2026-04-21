import { Circle, CheckCircle2 } from "lucide-react";
import type { MissionTimelineEvent } from "../lib/types";

type TimelineItemProps = {
  event: MissionTimelineEvent;
  onSelect: (event: MissionTimelineEvent) => void;
};

export function TimelineItem({ event, onSelect }: TimelineItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="group flex w-full items-start gap-3 py-2 text-left transition-all hover:translate-x-1"
    >
      <div className="relative flex flex-col items-center">
        <div
          className={`z-10 rounded-full border bg-slate-950 p-0.5 transition-colors ${
            event.status === "completed"
              ? "border-cyan-500 text-cyan-500"
              : event.status === "active"
                ? "border-amber-500 text-amber-500 animate-pulse"
                : "border-slate-800 text-slate-700"
          }`}
        >
          {event.status === "completed" ? (
            <CheckCircle2 className="h-2.5 w-2.5" />
          ) : (
            <Circle className="h-2.5 w-2.5 fill-current" />
          )}
        </div>
        <div className="absolute top-4 h-full w-px border-r border-dashed border-slate-800 group-last:hidden" />
      </div>

      <div className="flex flex-col gap-0.5 pb-4">
        <div className="flex items-center gap-2">
          <span className="tabular-nums text-[9px] font-black tracking-tighter text-slate-500">
            {event.timestamp}
          </span>
          <span
            className={`text-[8px] font-bold tracking-[0.15em] ${
              event.node === "SCOUT"
                ? "text-cyan-400/80"
                : event.node === "AUDITOR"
                  ? "text-indigo-400/80"
                  : event.node === "SUPERVISOR"
                    ? "text-amber-400/80"
                    : "text-slate-400/80"
            }`}
          >
            [{event.node}]
          </span>
        </div>
        <p
          className={`text-[10px] font-bold tracking-tight uppercase transition-colors ${
            event.status === "active" ? "text-white" : "text-slate-400 group-hover:text-slate-200"
          }`}
        >
          {event.label}
        </p>
      </div>
    </button>
  );
}
