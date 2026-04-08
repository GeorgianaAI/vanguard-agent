"use client";

import { useCallback, useState } from "react";
import type { MissionTimelineEvent } from "../lib/types";

type UseTimelineNavigationArgs = {
  timelineEvents: MissionTimelineEvent[];
};

export function useTimelineNavigation({
  timelineEvents,
}: UseTimelineNavigationArgs) {
  const [activeTimelineMessageId, setActiveTimelineMessageId] = useState<
    string | null
  >(null);

  const seekToTimelineIndex = useCallback(
    (index: number) => {
      const event = timelineEvents[index];
      if (!event) return;

      setActiveTimelineMessageId(event.messageId);
      requestAnimationFrame(() => {
        document
          .getElementById(`message-${event.messageId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [timelineEvents],
  );

  const handleSelectTimelineEvent = useCallback(
    (event: MissionTimelineEvent) => {
      setActiveTimelineMessageId(event.messageId);
      document
        .getElementById(`message-${event.messageId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [],
  );

  const resetTimelineSelection = useCallback(() => {
    setActiveTimelineMessageId(null);
  }, []);

  return {
    activeTimelineMessageId,
    seekToTimelineIndex,
    handleSelectTimelineEvent,
    resetTimelineSelection,
  };
}
