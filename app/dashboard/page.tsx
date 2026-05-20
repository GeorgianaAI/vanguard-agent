"use client";

import { useMemo, useState } from "react";
import { validateTargetInput } from "./lib/targetValidation";
import { CommandInput } from "./components/CommandInput";
import { DashboardHeader } from "./components/DashboardHeader";
import { MessageFeed } from "./components/MessageFeed";
import { MissionReplayHeader } from "./components/MissionReplayHeader";
import { TargetInput } from "./components/TargetInput";
import { TimelineSidebar } from "./components/TimelineSidebar";
import { ExportEvidenceButton } from "./components/ExportEvidenceButton";
import { useVanguardChat } from "./hooks/useVanguardChat";
import { buildMissionTimelineEvents } from "./lib/timeline";
import { hasOpenApproval } from "./lib/missionState";
import { downloadBlob } from "@/src/lib/browser/downloadBlob";
import { useTimelineNavigation } from "./hooks/useTimelineNavigation";

export default function VanguardDashboard() {
  const [target, setTarget] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [logoutPending, setLogoutPending] = useState<boolean>(false);

  async function handleLogout() {
    setLogoutPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  const targetValidation = useMemo(() => validateTargetInput(target), [target]);
  const targetError = targetValidation.error;

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
    threadId,
  } = useVanguardChat({ target: targetValidation.normalized, input, setInput });

  const awaitingAuthorizationLive = useMemo(
    () => surfaceMode === "live" && hasOpenApproval(messages),
    [messages, surfaceMode],
  );

  const reconLedActive = surfaceMode === "live" && (loading || awaitingAuthorizationLive);

  const timelineEvents = useMemo(() => buildMissionTimelineEvents(messages, null), [messages]);

  const {
    activeTimelineMessageId,
    seekToTimelineIndex,
    handleSelectTimelineEvent,
    resetTimelineSelection,
  } = useTimelineNavigation({ timelineEvents });

  const timelineEventsWithSelection = useMemo(
    () => buildMissionTimelineEvents(messages, activeTimelineMessageId),
    [messages, activeTimelineMessageId],
  );

  function handleResetMission() {
    resetTimelineSelection();
    setTarget("");
    setInput("");
    startNewMission();
  }

  const currentStep = timelineEventsWithSelection.findIndex((e) => e.status === "active") + 1;

  const hasCompletedAssistantResponse = useMemo(() => {
    return messages.some((message) => {
      if (message.role !== "assistant") return false;

      const text = message.parts
        .filter((part) => part.type === "text" || part.type === "reasoning")
        .map((part) => part.text ?? "")
        .join("\n")
        .trim()
        .toLowerCase();

      if (!text) return false;
      return !text.includes("authorization_required:");
    });
  }, [messages]);

  const showMissionCompleteExportBar =
    (surfaceMode === "live" || surfaceMode === "restored") &&
    !loading &&
    !awaitingAuthorizationLive &&
    hasCompletedAssistantResponse;

  const hintLedClass = surfaceMode === "restored" ? "bg-emerald-500" : "bg-amber-500";

  function handleExportEvidenceJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      thread_id: threadId,
      target: targetValidation.normalized || target,
      surface_mode: surfaceMode,
      timeline_events: timelineEventsWithSelection,
      messages,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const safeThread = threadId ?? "mission";
    downloadBlob({
      blob,
      filename: `vanguard-evidence-${safeThread}-${Date.now()}.json`,
    });
  }

  return (
    <div
      className="isolate min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100"
    >
      <DashboardHeader
        loading={loading}
        restored={surfaceMode === "restored"}
        reconLedActive={reconLedActive}
        onLogout={handleLogout}
        logoutPending={logoutPending}
        onResetMission={handleResetMission}
      />

      <div className="mx-auto max-w-300 px-4 pb-24 pt-8 sm:px-6 md:p-8">
        <main className="mx-auto grid w-full min-w-0 max-w-300 gap-6">
          <TargetInput target={target} setTarget={setTarget} error={target ? targetError : null} />

          <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
            <section className="min-w-0 w-full flex-1 lg:min-h-0">
              <MissionReplayHeader
                mode={surfaceMode}
                totalSteps={timelineEventsWithSelection.length}
                currentStep={Math.max(currentStep, 0)}
                seekDisabled={loading}
                onSeekStart={() => seekToTimelineIndex(0)}
                onSeekEnd={() =>
                  seekToTimelineIndex(Math.max(timelineEventsWithSelection.length - 1, 0))
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
                <div className="mb-4 flex flex-col gap-3 px-2">
                  {showMissionCompleteExportBar ? (
                    <div className="flex items-center justify-between border-t border-slate-900 pt-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${hintLedClass}`} />
                        {surfaceMode === "restored" ? (
                          <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase italic">
                            Transcript is read-only.{" "}
                            <span className="font-black text-slate-400">Reset Mission</span> to
                            start a new mission, then deploy.
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase italic">
                            Mission complete. Next deploy starts a fresh thread.
                            <span className="text-slate-400">
                              {" "}
                              Export evidence before redeploy.
                            </span>
                          </p>
                        )}
                      </div>

                      <ExportEvidenceButton onExport={handleExportEvidenceJson} />
                    </div>
                  ) : null}

                  <CommandInput
                    input={input}
                    loading={loading}
                    awaitingAuthorization={awaitingAuthorizationLive}
                    restored={surfaceMode === "restored"}
                    setInput={setInputValue}
                    onSubmit={onSubmit}
                    submitBlockedOverride={Boolean(targetError)}
                  />
                </div>
              </div>
            </section>

            <TimelineSidebar
              events={timelineEventsWithSelection}
              onSelectEvent={handleSelectTimelineEvent}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
