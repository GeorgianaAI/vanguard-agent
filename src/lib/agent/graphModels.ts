import { ChatAnthropic } from "@langchain/anthropic";
import { vanguardTools } from "./tools";

const SUPERVISOR_MODEL =
  process.env.ANTHROPIC_SUPERVISOR_MODEL ?? "claude-sonnet-4-6";
const SCOUT_MODEL = process.env.ANTHROPIC_SCOUT_MODEL ?? "claude-sonnet-4-6";

export function getSupervisorModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new ChatAnthropic({
    model: SUPERVISOR_MODEL,
    temperature: 0,
    apiKey,
    maxRetries: 3,
  });
}

export function getScoutModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  return new ChatAnthropic({
    model: SCOUT_MODEL,
    temperature: 0,
    apiKey,
    maxRetries: 3,
  }).bindTools(vanguardTools);
}
