import type { DashboardMessage } from "./types";
import type { AgentType } from "../components/AgentBadge";

function mapMetadataNode(raw: unknown): AgentType | null {
  if (raw === "supervisor") return "SUPERVISOR";
  if (raw === "scout") return "SCOUT";
  if (raw === "auditor") return "AUDITOR";
  return null;
}

/** Prefer `message.metadata.agent_node` from backend; stable neutral fallback when absent. */
export function resolveDashboardAgentType(message: DashboardMessage): AgentType | null {
  if (message.role === "user") return null;

  const fromMeta = mapMetadataNode(message.metadata?.agent_node);
  if (fromMeta) return fromMeta;

  // Stable neutral fallback when metadata is absent.
  // This avoids badge "correcting" mid-stream due to text/tool heuristics.
  return "PENDING";
}
