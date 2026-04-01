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
import { hasOpenApproval } from "./lib/missionState";
import { RESTORED_TRANSCRIPT_HINT } from "./lib/constants";

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
    surfaceMode,
    startNewMission,
  } = useVanguardChat({ target, input, setInput });

  const awaitingAuthorizationLive = useMemo(
    () => surfaceMode === "live" && hasOpenApproval(messages),
    [messages, surfaceMode],
  );

  const reconLedActive =
    surfaceMode === "live" && (loading || awaitingAuthorizationLive);

  function handleResetMission() {
    setActiveTimelineMessageId(null);
    setTarget("");
    setInput("");
    startNewMission();
  }

  const timelineEvents = useMemo(
    () => buildMissionTimelineEvents(messages, activeTimelineMessageId),
    [messages, activeTimelineMessageId],
  );

  const currentStep =
    timelineEvents.findIndex((e) => e.status === "active") + 1;

  function seekToTimelineIndex(index: number) {
    const event = timelineEvents[index];
    if (!event) return;
    setActiveTimelineMessageId(event.messageId);
    requestAnimationFrame(() => {
      document
        .getElementById(`message-${event.messageId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

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
          restored={surfaceMode === "restored"}
          reconLedActive={reconLedActive}
          onLogout={handleLogout}
          logoutPending={logoutPending}
          onResetMission={handleResetMission}
        />

        <main className="mx-auto grid w-full min-w-0 max-w-[1200px] gap-6">
          <TargetInput target={target} setTarget={setTarget} />

          <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
            <section className="min-w-0 w-full flex-1 lg:min-h-0">
              <MissionReplayHeader
                mode={surfaceMode}
                totalSteps={timelineEvents.length}
                currentStep={Math.max(currentStep, 0)}
                seekDisabled={loading}
                onSeekStart={() => seekToTimelineIndex(0)}
                onSeekEnd={() =>
                  seekToTimelineIndex(Math.max(timelineEvents.length - 1, 0))
                }
              />

              <MessageFeed
                messages={messages}
                error={error}
                operatorNotice={operatorNotice}
                onAuthorize={authorizeTool}
                onAbort={abortTool}
                approvalDisabled={loading || surfaceMode === "restored"}
              />

              <div className="mt-6">
                {surfaceMode === "restored" ? (
                  <p className="mb-2 text-xs italic text-slate-500">
                    {RESTORED_TRANSCRIPT_HINT}
                  </p>
                ) : null}
                <CommandInput
                  input={input}
                  loading={loading}
                  awaitingAuthorization={awaitingAuthorizationLive}
                  restored={surfaceMode === "restored"}
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
