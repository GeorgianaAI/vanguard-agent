import { z } from "zod";
import type { ApprovalRiskLevel, ApprovalSideEffects } from "./types";

const DOMAIN_RE = /^(?=.{1,253}$)(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+\.?$/i;

const toolArgValidators = {
  domain_whois: z.object({
    domain: z.string().trim().min(3).max(253).regex(DOMAIN_RE),
  }),
  tavily_search: z.object({
    query: z.string().trim().min(3).max(300),
  }),
} as const;

export const APPROVAL_TOOL_ALLOWLIST = Object.keys(toolArgValidators);

export function isAllowedApprovalTool(toolName: string): boolean {
  return APPROVAL_TOOL_ALLOWLIST.includes(toolName);
}

export function validateApprovalToolArgs(toolName: string, args: Record<string, unknown>): boolean {
  const validator = (toolArgValidators as Record<string, z.ZodTypeAny>)[toolName];
  if (!validator) return false;
  return validator.safeParse(args).success;
}

export function getApprovalPolicyLabel(toolName: string): string {
  if (toolName === "domain_whois") return "READ-ONLY PUBLIC DATA";
  if (toolName === "tavily_search") return "NETWORK QUERY";
  return "EXECUTION / HIGH RISK";
}

export function getApprovalRisk(toolName: string): ApprovalRiskLevel {
  if (toolName === "domain_whois") return "low";
  if (toolName === "tavily_search") return "medium";
  return "high";
}

export function getApprovalSideEffects(toolName: string): ApprovalSideEffects {
  if (toolName === "domain_whois") return "read_only_public_data";
  if (toolName === "tavily_search") return "read_only_network_query";
  return "execution_high_risk";
}
