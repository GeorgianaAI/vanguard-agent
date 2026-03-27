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

async function supervisorNode(state: VanguardStateType) {
  if (state.iterationCount > 10) {
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

  const decision = await supervisor.invoke([
    systemPrompt,
    ...supervisorMessages,
  ]);
  const text =
    AIMessage.isInstance(decision) && typeof decision.content === "string"
      ? decision.content.toUpperCase()
      : "";

  // Internal routing only
  return {
    next: text.includes("AUDITOR") ? "auditor" : "scout",
  };
}

async function scoutNode(state: VanguardStateType) {
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
      "Do not provide offensive guidance.",
      "Be concise and factual.",
    ].join("\n"),
  );

  const scoutMessages = ensureEndsWithUser(
    state.messages,
    `Target: ${state.target || "unspecified"}. Continue defensive OSINT collection.`,
  );

  const response = await scout.invoke([systemPrompt, ...scoutMessages]);

  return {
    messages: [response],
    iterationCount: 1,
    isPendingApproval: false,
    // Consume authorization after scout executes once.
    isAuthorized: false,
  };
}

async function auditorNode(state: VanguardStateType) {
  const auditor = getSupervisorModel();

  const systemPrompt = new SystemMessage(
    [
      "You are Vanguard Auditor.",
      "Produce concise defensive intelligence summary from collected public evidence.",
      "Format:",
      "1) Findings (3-6 bullets)",
      "2) Confidence (low/medium/high + one-line reason)",
      "3) Safe defensive next actions",
      "Do not include offensive guidance.",
    ].join("\n"),
  );

  const auditorMessages = ensureEndsWithUser(
    state.messages,
    "Finalize the defensive mission summary.",
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
  .addEdge("__start__", "supervisor")
  .addConditionalEdges("supervisor", routeFromSupervisor)
  .addConditionalEdges("scout", routeFromScout)
  .addEdge("tools", "auditor")
  .addEdge("auditor", END)
  .compile({
    checkpointer,
  });
