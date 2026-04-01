import { Clock } from "lucide-react";
import type { MissionTimelineEvent } from "../lib/types";
import { TimelineItem } from "./TimelineItem";

type TimelineSidebarProps = {
  events: MissionTimelineEvent[];
  onSelectEvent: (event: MissionTimelineEvent) => void;
};

export function TimelineSidebar({
  events,
  onSelectEvent,
}: TimelineSidebarProps) {
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 lg:w-72">
      <div className="mb-5 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Mission Timeline
        </h2>
      </div>

      <nav className="max-h-[520px] overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-xs text-slate-500">
            Timeline populates as mission events stream.
          </p>
        ) : (
          events.map((event) => (
            <TimelineItem
              key={event.id}
              event={event}
              onSelect={onSelectEvent}
            />
          ))
        )}
      </nav>
    </aside>
  );
}
