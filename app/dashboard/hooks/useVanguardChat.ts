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
  approvalId: string;
  approvalContextHash: string;
  approvalContext: unknown;
};

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
  if (/400|Invalid mission|Missing thread_id|Missing approved boolean/i.test(msg)) {
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

  const approvalInFlight = useRef(false);

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

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
    ...(threadId != null ? { id: threadId } : {}),
    resume: false,
    onError: (err) => {
      setOperatorNotice(formatChatTransportError(err));
    },
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

    dismissNotice();
    setInput("");
    const activeThreadId = shouldStartFreshMission(messages)
      ? createThreadId()
      : ensureThreadId();

    if (activeThreadId !== threadId) {
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
      const err = error instanceof Error ? error : new Error(String(error ?? ""));
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
  };
}
