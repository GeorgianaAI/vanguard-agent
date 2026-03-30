import { ChatAnthropic } from "@langchain/anthropic";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { END, StateGraph } from "@langchain/langgraph";
import { getCheckpointer } from "./checkpointer";
import { VanguardStateAnnotation, VanguardStateType } from "./state";
import { toolNode, vanguardTools } from "./tools";
import { computeApprovalContextHash, computeArgHash } from "../approval/hash";
import {
  APPROVAL_TOOL_ALLOWLIST,
  getApprovalRisk,
  getApprovalSideEffects,
} from "../approval/policy";
import type { ApprovalContextV1 } from "../approval/types";

export const runtime = "edge";

const SUPERVISOR_MODEL =
  process.env.ANTHROPIC_SUPERVISOR_MODEL ?? "claude-sonnet-4-6";
const SCOUT_MODEL = process.env.ANTHROPIC_SCOUT_MODEL ?? "claude-sonnet-4-6";
const APPROVAL_SIGNAL_PREFIX = "AUTHORIZATION_REQUIRED:";
const APPROVAL_TTL_MS = 1000 * 60 * 10;

function getSupervisorModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new ChatAnthropic({
    model: SUPERVISOR_MODEL,
    temperature: 0,
    apiKey,
    maxRetries: 3,
  });
}

function getScoutModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new ChatAnthropic({
    model: SCOUT_MODEL,
    temperature: 0,
    apiKey,
    maxRetries: 3,
  }).bindTools(vanguardTools);
}

function ensureEndsWithUser(
  messages: VanguardStateType["messages"],
  fallback: string,
) {
  const prepared = [...messages];
  const last = prepared[prepared.length - 1];
  if (!last || !HumanMessage.isInstance(last)) {
    prepared.push(new HumanMessage(fallback));
  }
  return prepared;
}

function normalizeTargetToDomain(target: string): string {
  const trimmed = target.trim().toLowerCase();
  if (!trimmed) return "example.com";
  const withoutScheme = trimmed.replace(/^https?:\/\//, "");
  return withoutScheme.split("/")[0] || "example.com";
}

function diffSinceLastApproval(
  current: { toolName: string; toolArgHash: string; target: string },
  state: VanguardStateType,
): string[] {
  const previous = state.approvalHistory[state.approvalHistory.length - 1];
  if (!previous) return ["First authorization in this thread."];
  const changes: string[] = [];
  if (previous.tool_name !== current.toolName) {
    changes.push(`Tool changed: ${previous.tool_name} -> ${current.toolName}`);
  }
  if (previous.tool_arg_hash !== current.toolArgHash) {
    changes.push("Tool arguments changed from prior approval.");
  }
  const previousTarget = state.pendingApprovalContext?.constraints.target_lock ?? "";
  if (previousTarget && previousTarget !== current.target) {
    changes.push(`Target changed: ${previousTarget} -> ${current.target}`);
  }
  if (changes.length === 0) {
    changes.push("No material changes from prior approved action.");
  }
  return changes;
}

async function buildApprovalContext(
  state: VanguardStateType,
): Promise<{ context: ApprovalContextV1; contextHash: string }> {
  const now = Date.now();
  const requestedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + APPROVAL_TTL_MS).toISOString();
  const targetDomain = normalizeTargetToDomain(state.target || "example.com");
  const toolName = "domain_whois";
  const toolArgs: Record<string, unknown> = { domain: targetDomain };
  const toolArgHash = await computeArgHash(toolArgs);
  const approvalId = `apr_${crypto.randomUUID()}`;

  const context: ApprovalContextV1 = {
    version: 1,
    approval_id: approvalId,
    thread_id: "pending-thread-binding",
    requested_at: requestedAt,
    expires_at: expiresAt,
    requested_by_node: "scout",
    summary:
      "Need registrar and registration event data before deeper corroboration.",
    reasoning_excerpt:
      "WHOIS/RDAP data anchors identity and registration timeline before broader web corroboration.",
    risk_level: getApprovalRisk(toolName),
    side_effects: getApprovalSideEffects(toolName),
    policy_tags: ["public-data", "osint", "read-only"],
    budget: {
      estimated_tokens: 1200,
      max_tokens_for_step: 3000,
    },
    tool: {
      name: toolName,
      args: toolArgs,
      args_display: {
        domain: targetDomain,
      },
      arg_hash: toolArgHash,
    },
    expected_output: ["registrar", "status", "registration/expiration events"],
    constraints: {
      allowed_tools: [...APPROVAL_TOOL_ALLOWLIST],
      target_lock: targetDomain,
    },
    prior_approvals_in_thread: state.approvalHistory.length,
    changes_since_last: diffSinceLastApproval(
      { toolName, toolArgHash, target: targetDomain },
      state,
    ),
  };

  const contextHash = await computeApprovalContextHash(context);
  context.approval_context_hash = contextHash;
  return { context, contextHash };
}

/**
 * Entry-point router.
 * - If mission was aborted: go straight to auditor for closure message.
 * - If operator just authorized: skip supervisor, go directly to scout.
 * - If scout already ran: skip to auditor.
 * - Default: go through supervisor (initial mission start).
 */
function routeFromStart(
  state: VanguardStateType,
): "supervisor" | "scout" | "auditor" {
  if (state.missionAborted) return "auditor";
  if (state.scoutHasRun) return "auditor";
  if (state.isAuthorized) return "scout";
  return "supervisor";
}

async function supervisorNode(state: VanguardStateType) {
  if (state.iterationCount > 10) {
    return { next: "auditor" };
  }

  if (state.scoutHasRun) {
    return { next: "auditor" };
  }
  return { next: "scout" };
}

async function scoutNode(state: VanguardStateType) {
  // Should not reach here after running — routeFromStart guards this, but be defensive.
  if (state.scoutHasRun) {
    return { next: "auditor" };
  }

  // Idempotency guard: if approval is already pending, do not emit another
  // authorization prompt for accidental duplicate resumes.
  if (!state.isAuthorized && state.isPendingApproval) {
    return {};
  }

  if (!state.isAuthorized) {
    const { context, contextHash } = await buildApprovalContext(state);
    const serializedContext = JSON.stringify(context);
    const approvalPayload = `${APPROVAL_SIGNAL_PREFIX}${serializedContext}`;
    const approvalMessage = new AIMessage(approvalPayload);

    return {
      isPendingApproval: true,
      pendingApprovalContext: context,
      pendingApprovalHash: contextHash,
      pendingApprovalId: context.approval_id,
      messages: [approvalMessage],
    };
  }

  const scout = getScoutModel();

  const systemPrompt = new SystemMessage(
    [
      "You are Vanguard Scout for authorized defensive OSINT.",
      "Use only public, non-invasive sources.",
      "Tool policy:",
      "- domain_whois for registrar/ownership/registration metadata.",
      "- tavily_search for public corroboration and references.",
      "You MUST call both domain_whois and tavily_search tools now. Do not skip either.",
      "Do not provide offensive guidance.",
      "Be concise and factual.",
    ].join("\n"),
  );

  const scoutMessages = ensureEndsWithUser(
    state.messages,
    `Target: ${state.target || "unspecified"}. Run domain_whois and tavily_search now.`,
  );

  const response = await scout.invoke([systemPrompt, ...scoutMessages]);

  return {
    messages: [response],
    iterationCount: 1,
    isPendingApproval: false,
    pendingApprovalContext: null,
    pendingApprovalHash: null,
    pendingApprovalId: null,
    isAuthorized: false,
    scoutHasRun: true,
  };
}

async function auditorNode(state: VanguardStateType) {
  const auditor = getSupervisorModel();

  const hasEvidence = state.messages.some((m) => ToolMessage.isInstance(m));
  const wasAborted = state.missionAborted === true;

  let systemPromptLines: string[];

  if (wasAborted) {
    systemPromptLines = [
      "You are Vanguard Auditor.",
      "The operator aborted this mission before any tools were executed.",
      "Acknowledge the abort, confirm no external tools were run, and suggest safe next steps in 2-3 sentences.",
      "Do not include offensive guidance.",
    ];
  } else if (hasEvidence) {
    systemPromptLines = [
      "You are Vanguard Auditor.",
      "Produce a concise defensive intelligence summary from the tool results above.",
      "Format:",
      "1) Findings (3-6 bullets)",
      "2) Confidence (low/medium/high + one-line reason)",
      "3) Safe defensive next actions",
      "Do not include offensive guidance.",
    ];
  } else {
    systemPromptLines = [
      "You are Vanguard Auditor.",
      "Reconnaissance did not complete — no tool results available.",
      "State this briefly and list safe next steps only.",
      "Do not include offensive guidance.",
    ];
  }

  const systemPrompt = new SystemMessage(systemPromptLines.join("\n"));

  const auditorMessages = ensureEndsWithUser(
    state.messages,
    wasAborted
      ? "Mission was aborted by operator. Provide closure."
      : "Finalize the defensive mission summary.",
  );

  const response = await auditor.invoke([systemPrompt, ...auditorMessages]);

  return {
    messages: [response],
    next: "end",
    isPendingApproval: false,
    pendingApprovalContext: null,
    pendingApprovalHash: null,
    pendingApprovalId: null,
    isAuthorized: false,
    missionAborted: false,
  };
}

function routeFromSupervisor(state: VanguardStateType) {
  return state.next === "auditor" ? "auditor" : "scout";
}

function routeFromScout(state: VanguardStateType) {
  if (state.isPendingApproval) return END;

  const last = state.messages[state.messages.length - 1];
  if (
    last &&
    AIMessage.isInstance(last) &&
    (last.tool_calls?.length ?? 0) > 0
  ) {
    return "tools";
  }

  return "auditor";
}

const checkpointer = getCheckpointer();

export const vanguardGraph = new StateGraph(VanguardStateAnnotation)
  .addNode("supervisor", supervisorNode)
  .addNode("scout", scoutNode)
  .addNode("tools", toolNode)
  .addNode("auditor", auditorNode)
  .addConditionalEdges("__start__", routeFromStart)
  .addConditionalEdges("supervisor", routeFromSupervisor)
  .addConditionalEdges("scout", routeFromScout)
  .addEdge("tools", "auditor")
  .addEdge("auditor", END)
  .compile({
    checkpointer,
  });
