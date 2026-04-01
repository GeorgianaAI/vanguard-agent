"use client";

import { useMemo, useState } from "react";
import { CommandInput } from "./components/CommandInput";
import { DashboardHeader } from "./components/DashboardHeader";
import { MessageFeed } from "./components/MessageFeed";
import { MissionReplayHeader } from "./components/MissionReplayHeader";
import { TargetInput } from "./components/TargetInput";
import { TimelineSidebar } from "./components/TimelineSidebar";
import { useVanguardChat } from "./hooks/useVanguardChat";
import { buildMissionTimelineEvents } from "./lib/timeline";
import type { MissionTimelineEvent } from "./lib/types";

export default function VanguardDashboard() {
  const [target, setTarget] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [logoutPending, setLogoutPending] = useState<boolean>(false);
  const [activeTimelineMessageId, setActiveTimelineMessageId] = useState<
    string | null
  >(null);

  async function handleLogout() {
    setLogoutPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  const {
    messages,
    error,
    loading,
    onSubmit,
    authorizeTool,
    abortTool,
    setInputValue,
    operatorNotice,
    startNewMission,
  } = useVanguardChat({ target, input, setInput });

  function handleNewMission() {
    setActiveTimelineMessageId(null);
    startNewMission();
  }

  const timelineEvents = useMemo(
    () => buildMissionTimelineEvents(messages, activeTimelineMessageId),
    [messages, activeTimelineMessageId],
  );

  const currentStep =
    timelineEvents.findIndex((e) => e.status === "active") + 1;

  function handleSelectTimelineEvent(event: MissionTimelineEvent) {
    setActiveTimelineMessageId(event.messageId);

    const el = document.getElementById(`message-${event.messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <div className="isolate min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-32 sm:px-6 md:p-8">
        <DashboardHeader
          loading={loading}
          onLogout={handleLogout}
          logoutPending={logoutPending}
          onNewMission={handleNewMission}
        />

        <main className="mx-auto grid w-full min-w-0 max-w-[1200px] gap-6">
          <TargetInput target={target} setTarget={setTarget} />

          <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
            <section className="min-w-0 w-full flex-1 lg:min-h-0">
              <MissionReplayHeader
                totalSteps={timelineEvents.length}
                currentStep={Math.max(currentStep, 0)}
              />

              <MessageFeed
                messages={messages}
                error={error}
                operatorNotice={operatorNotice}
                onAuthorize={authorizeTool}
                onAbort={abortTool}
                approvalDisabled={loading}
              />

              <div className="mt-6">
                <CommandInput
                  input={input}
                  loading={loading}
                  setInput={setInputValue}
                  onSubmit={onSubmit}
                />
              </div>
            </section>

            <TimelineSidebar
              events={timelineEvents}
              onSelectEvent={handleSelectTimelineEvent}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
