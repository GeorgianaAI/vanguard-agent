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

export const runtime = "edge";

const SUPERVISOR_MODEL =
  process.env.ANTHROPIC_SUPERVISOR_MODEL ?? "claude-sonnet-4-6";
const SCOUT_MODEL = process.env.ANTHROPIC_SCOUT_MODEL ?? "claude-sonnet-4-6";
const APPROVAL_SIGNAL_PREFIX = "AUTHORIZATION_REQUIRED:";

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
    const gateModel = getSupervisorModel();
    const gateResponse = await gateModel.invoke([
      new SystemMessage(
        [
          "You are Vanguard authorization gate.",
          "Respond with one concise sentence prefixed by AUTHORIZATION_REQUIRED:.",
          "Do not add markdown or extra sections.",
        ].join("\n"),
      ),
      new HumanMessage(
        `Target: ${state.target || "unspecified"}. Manual authorization is required before external tools run.`,
      ),
    ]);

    const gateContent =
      AIMessage.isInstance(gateResponse) && typeof gateResponse.content === "string"
        ? gateResponse.content.trim()
        : "";

    const approvalMessage =
      gateContent.startsWith(APPROVAL_SIGNAL_PREFIX)
        ? new AIMessage(gateContent)
        : new AIMessage(
            `${APPROVAL_SIGNAL_PREFIX} Manual authorization is required before external public-intel tools can run.`,
          );

    return {
      isPendingApproval: true,
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
