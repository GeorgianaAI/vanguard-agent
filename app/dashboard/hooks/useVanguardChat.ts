import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createThreadId,
  getApprovalPayloadFromPart,
  getToolCallId,
  THREAD_STORAGE_KEY,
} from "../lib/chatHelpers";
import { DEFAULT_TARGET } from "../lib/constants";
import { shouldStartFreshMission } from "../lib/missionState";
import type { DashboardMessage, ToolPart } from "../lib/types";
import { isLoadingStatus } from "../lib/utils";

type UseVanguardChatArgs = {
  target: string;
  input: string;
  setInput: (value: string) => void;
};

type ApprovalAction = {
  approved: boolean;
  toolCallId: string;
  approvalId: string;
  approvalContextHash: string;
  approvalContext: unknown;
};

export type MissionSurfaceMode = "live" | "restored";

function readStoredThreadId(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(THREAD_STORAGE_KEY);
  return stored && stored.trim().length > 0 ? stored : null;
}

function formatChatTransportError(err: Error): string {
  const msg = err.message ?? "";
  if (/429|Too many missions|cool down/i.test(msg)) {
    return "Rate limited — too many missions. Wait and retry, or reduce request frequency.";
  }
  if (/409|Approval already processed|no pending authorization/i.test(msg)) {
    return "This authorization step is no longer valid (already completed or expired). Try refreshing or starting a new mission.";
  }
  if (
    /400|Invalid mission|Missing thread_id|Missing approved boolean/i.test(msg)
  ) {
    return `Request rejected: ${msg}`;
  }
  if (/Missing approval context binding/i.test(msg)) {
    return `Request rejected: ${msg}`;
  }
  if (/500|Mission Aborted|Uplink Failure/i.test(msg)) {
    return "Mission uplink failed. Check connectivity and try again.";
  }
  return msg || "Mission uplink error.";
}

export function useVanguardChat({
  target,
  input,
  setInput,
}: UseVanguardChatArgs) {
  /** null only until client init runs; avoids passing id: undefined into useChat (recreates Chat every render). */
  const [threadId, setThreadId] = useState<string | null>(null);
  const [operatorNotice, setOperatorNotice] = useState<string | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<MissionSurfaceMode>("live");

  const approvalInFlight = useRef(false);
  /** Avoid duplicate history fetches for the same thread; cleared on new thread / reset. */
  const lastCompletedHistoryForThreadRef = useRef<string | null>(null);

  const dismissNotice = useCallback(() => setOperatorNotice(null), []);

  useEffect(() => {
    setThreadId((prev) => prev ?? readStoredThreadId() ?? createThreadId());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !threadId) return;
    window.localStorage.setItem(THREAD_STORAGE_KEY, threadId);
  }, [threadId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
  );

  const { messages, sendMessage, status, error, setMessages } =
    useChat<DashboardMessage>({
      transport,
      ...(threadId != null ? { id: threadId } : {}),
      resume: false,
      onError: (err) => {
        setOperatorNotice(formatChatTransportError(err));
      },
    });

  const loading = isLoadingStatus(status);

  useEffect(() => {
    if (typeof window === "undefined" || !threadId) return;
    if (lastCompletedHistoryForThreadRef.current === threadId) return;

    const ac = new AbortController();

    void (async () => {
      try {
        const res = await fetch(
          `/api/chat/history?thread_id=${encodeURIComponent(threadId)}`,
          { signal: ac.signal },
        );
        if (ac.signal.aborted) return;

        if (!res.ok) {
          lastCompletedHistoryForThreadRef.current = threadId;
          setOperatorNotice(
            res.status === 401
              ? "Session expired — sign in again to load mission history."
              : "Could not load mission history for this thread.",
          );
          return;
        }
        const data = (await res.json()) as { messages?: DashboardMessage[] };
        const incoming = data.messages ?? [];
        lastCompletedHistoryForThreadRef.current = threadId;
        if (incoming.length > 0) {
          setMessages(incoming);
          setSurfaceMode("restored");
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (ac.signal.aborted) return;
        lastCompletedHistoryForThreadRef.current = threadId;
        setOperatorNotice("Could not load mission history.");
      }
    })();

    return () => ac.abort();
  }, [threadId, setMessages]);

  const startNewMission = useCallback(() => {
    dismissNotice();
    const next = createThreadId();
    lastCompletedHistoryForThreadRef.current = null;
    setThreadId(next);
    setMessages([]);
    setSurfaceMode("live");
  }, [dismissNotice, setMessages]);

  function ensureThreadId() {
    if (threadId) return threadId;
    const next = createThreadId();
    setThreadId(next);
    return next;
  }

  const onSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (surfaceMode === "restored") return;

    const text = input.trim();
    if (!text) return;
    if (loading) return;

    dismissNotice();
    setInput("");
    setSurfaceMode("live");
    const activeThreadId = shouldStartFreshMission(messages)
      ? createThreadId()
      : ensureThreadId();

    if (activeThreadId !== threadId) {
      lastCompletedHistoryForThreadRef.current = null;
      setThreadId(activeThreadId);
      setMessages([]);
    }

    try {
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
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setOperatorNotice(formatChatTransportError(err));
    }
  };

  async function sendApproval({
    approved,
    toolCallId,
    approvalId,
    approvalContextHash,
    approvalContext,
  }: ApprovalAction) {
    if (loading) return;
    if (approvalInFlight.current) return;
    if (!threadId) return;

    approvalInFlight.current = true;
    dismissNotice();
    setSurfaceMode("live");
    try {
      await sendMessage(
        { text: approved ? "Mission authorized" : "Mission aborted" },
        {
          body: {
            isApproval: true,
            approved,
            thread_id: threadId,
            tool_call_id: toolCallId,
            approval_id: approvalId,
            approval_context_hash: approvalContextHash,
            approval_context: approvalContext,
            target: target.trim() || DEFAULT_TARGET,
          },
        },
      );
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error(String(error ?? ""));
      setOperatorNotice(formatChatTransportError(err));
    } finally {
      approvalInFlight.current = false;
    }
  }

  async function authorizeTool(part: ToolPart) {
    if (loading || approvalInFlight.current) return;
    const toolCallId = getToolCallId(part);
    const payload = getApprovalPayloadFromPart(part);
    const approvalId = payload.approvalId ?? toolCallId;
    if (!toolCallId || !approvalId || !payload.approvalContextHash) return;
    await sendApproval({
      approved: true,
      toolCallId,
      approvalId,
      approvalContextHash: payload.approvalContextHash,
      approvalContext: payload.approvalContext,
    });
  }

  async function abortTool(part: ToolPart) {
    if (loading || approvalInFlight.current) return;
    const toolCallId = getToolCallId(part);
    const payload = getApprovalPayloadFromPart(part);
    const approvalId = payload.approvalId ?? toolCallId;
    if (!toolCallId || !approvalId || !payload.approvalContextHash) return;
    await sendApproval({
      approved: false,
      toolCallId,
      approvalId,
      approvalContextHash: payload.approvalContextHash,
      approvalContext: payload.approvalContext,
    });
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
    operatorNotice,
    dismissNotice,
    surfaceMode,
    startNewMission,
  };
}
