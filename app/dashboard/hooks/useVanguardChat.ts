import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TARGET } from "../lib/constants";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!threadId) return;
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
    const activeThreadId = ensureThreadId();

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
    const activeThreadId = ensureThreadId();

    await sendMessage(
      { text: approved ? "Mission authorized" : "Mission aborted" },
      {
        body: {
          isApproval: true,
          approved,
          thread_id: activeThreadId,
          tool_call_id: toolCallId,
          target: target.trim() || DEFAULT_TARGET,
        },
      },
    );
  }

  async function authorizeTool(part: ToolPart) {
    const toolCallId = getToolCallId(part);
    if (!toolCallId) return;
    await sendApproval({ approved: true, toolCallId });
  }

  async function abortTool(part: ToolPart) {
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
