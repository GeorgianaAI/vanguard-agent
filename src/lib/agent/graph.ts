import { ChatAnthropic } from "@langchain/anthropic";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
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

  const hasUsableMessages = state.messages.some((message) => {
    if (typeof message.content === "string") {
      return message.content.trim().length > 0;
    }
    if (Array.isArray(message.content)) {
      return message.content.length > 0;
    }
    return false;
  });

  if (!hasUsableMessages) {
    return { next: "scout" };
  }

  const supervisor = getSupervisorModel();

  const systemPrompt = new SystemMessage(
    [
      "You are Vanguard Supervisor for authorized defensive OSINT workflows.",
      "Mission is public, non-invasive defensive intelligence only.",
      "Allowed: WHOIS/RDAP metadata, public web references, defensive summaries.",
      "Forbidden: exploitation, intrusion instructions, evasion, attack planning.",
      "Decide next step:",
      "- SCOUT when additional public evidence is needed.",
      "- AUDITOR when evidence is sufficient for final defensive summary.",
      "Respond with one token only: SCOUT or AUDITOR.",
    ].join("\n"),
  );

  const supervisorMessages = ensureEndsWithUser(
    state.messages,
    "Evaluate mission state and choose the next step.",
  );

  const decision = await supervisor.invoke([systemPrompt, ...supervisorMessages]);
  const text =
    AIMessage.isInstance(decision) && typeof decision.content === "string"
      ? decision.content.toUpperCase()
      : "";

  return {
    next: text.includes("AUDITOR") ? "auditor" : "scout",
  };
}

async function scoutNode(state: VanguardStateType) {
  // Should not reach here after running — routeFromStart guards this, but be defensive.
  if (state.scoutHasRun) {
    return { next: "auditor" };
  }

  if (!state.isAuthorized) {
    return {
      isPendingApproval: true,
      messages: [
        new AIMessage({
          content:
            `${APPROVAL_SIGNAL_PREFIX} ` +
            "Manual authorization is required before external public-intel tools can run.",
        }),
      ],
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

  const hasEvidence = state.messages.some((m) => m.getType() === "tool");
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
