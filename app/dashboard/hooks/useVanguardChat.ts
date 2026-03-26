import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName } from "ai";
import { useMemo } from "react";
import {
  APPROVAL_ERROR_TEXT,
  APPROVAL_REASON_AUTH,
  APPROVAL_REASON_DENY,
  DEFAULT_TARGET,
} from "../lib/constants";
import type { ToolPart } from "../lib/types";
import { isLoadingStatus } from "../lib/utils";

type UseVanguardChatArgs = {
  target: string;
  input: string;
  setInput: (value: string) => void;
};

export function useVanguardChat({
  target,
  input,
  setInput,
}: UseVanguardChatArgs) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
  );

  const {
    messages,
    sendMessage,
    addToolOutput,
    addToolApprovalResponse,
    status,
    error,
  } = useChat({ transport });

  const loading = isLoadingStatus(status);

  async function onSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = input.trim();
    if (!text) return;

    setInput("");

    await sendMessage(
      { text },
      {
        body: {
          target: target.trim() || DEFAULT_TARGET,
        },
      },
    );
  }

  async function authorizeTool(part: ToolPart) {
    if ("approval" in part && part.approval?.id) {
      await addToolApprovalResponse({
        id: part.approval.id,
        approved: true,
        reason: APPROVAL_REASON_AUTH,
      });
      return;
    }

    // Fallback if approval id is not emitted by backend.
    await addToolOutput({
      tool: getToolName(part),
      toolCallId: part.toolCallId,
      state: "output-available",
      output: { approved: true, reason: APPROVAL_REASON_AUTH },
    });
  }

  async function abortTool(part: ToolPart) {
    if ("approval" in part && part.approval?.id) {
      await addToolApprovalResponse({
        id: part.approval.id,
        approved: false,
        reason: APPROVAL_REASON_DENY,
      });
      return;
    }

    // Fallback if approval id is not emitted by backend.
    await addToolOutput({
      tool: getToolName(part),
      toolCallId: part.toolCallId,
      state: "output-error",
      errorText: APPROVAL_ERROR_TEXT,
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
    onSubmit,
    authorizeTool,
    abortTool,
    setInputValue,
  };
}
