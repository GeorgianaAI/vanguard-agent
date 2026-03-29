import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TARGET } from "../lib/constants";
import { shouldStartFreshMission } from "../lib/missionState";
import type { ToolPart } from "../lib/types";
import { isLoadingStatus } from "../lib/utils";

type UseVanguardChatArgs = {
  target: string;
  input: string;
  setInput: (value: string) => void;
};

type ApprovalAction = {
  approved: boolean;
  toolCallId: string;
};

const THREAD_STORAGE_KEY = "vanguard-thread-id";

function createThreadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `vanguard-${crypto.randomUUID()}`;
  }
  return `vanguard-${Date.now()}`;
}

function readStoredThreadId(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(THREAD_STORAGE_KEY);
  return stored && stored.trim().length > 0 ? stored : null;
}

function getToolCallId(part: ToolPart): string | null {
  if (!part || typeof part !== "object") return null;
  if (!("toolCallId" in part)) return null;
  const value = part.toolCallId;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function useVanguardChat({
  target,
  input,
  setInput,
}: UseVanguardChatArgs) {
  const [threadId, setThreadId] = useState<string | null>(() =>
    readStoredThreadId(),
  );

  // Ref-based guard: prevents double-submission on approval buttons.
  // A ref is used instead of state to avoid re-render lag between clicks.
  const approvalInFlight = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!threadId) {
      window.localStorage.removeItem(THREAD_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(THREAD_STORAGE_KEY, threadId);
  }, [threadId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
    id: threadId ?? undefined,
    resume: false,
  });

  const loading = isLoadingStatus(status);

  function ensureThreadId() {
    if (threadId) return threadId;
    const next = createThreadId();
    setThreadId(next);
    return next;
  }

  const onSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = input.trim();
    if (!text) return;
    if (loading) return;

    setInput("");
    const activeThreadId = shouldStartFreshMission(messages)
      ? createThreadId()
      : ensureThreadId();

    if (activeThreadId !== threadId) {
      setThreadId(activeThreadId);
      setMessages([]);
    }

    await sendMessage(
      { text },
      {
        body: {
          target: target.trim() || DEFAULT_TARGET,
          thread_id: activeThreadId,
          isApproval: false,
        },
      },
    );
  };

  async function sendApproval({ approved, toolCallId }: ApprovalAction) {
    // Prevent double-click while loading OR while an approval is already in flight.
    if (loading) return;
    if (approvalInFlight.current) return;
    if (!threadId) return;

    approvalInFlight.current = true;
    try {
      await sendMessage(
        { text: approved ? "Mission authorized" : "Mission aborted" },
        {
          body: {
            isApproval: true,
            approved,
            thread_id: threadId,
            tool_call_id: toolCallId,
            target: target.trim() || DEFAULT_TARGET,
          },
        },
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error ?? "");
      if (
        raw.includes("Approval already processed") ||
        raw.includes("409")
      ) {
        return;
      }
      throw error;
    } finally {
      approvalInFlight.current = false;
    }
  }

  async function authorizeTool(part: ToolPart) {
    if (loading || approvalInFlight.current) return;
    const toolCallId = getToolCallId(part);
    if (!toolCallId) return;
    await sendApproval({ approved: true, toolCallId });
  }

  async function abortTool(part: ToolPart) {
    if (loading || approvalInFlight.current) return;
    const toolCallId = getToolCallId(part);
    if (!toolCallId) return;
    await sendApproval({ approved: false, toolCallId });
  }

  function setInputValue(value: string) {
    setInput(value);
  }

  return {
    messages,
    status,
    error,
    loading,
    threadId,
    setThreadId,
    onSubmit,
    authorizeTool,
    abortTool,
    setInputValue,
    setMessages,
  };
}
