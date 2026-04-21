import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import type { ApprovalContextV1, ApprovalDecision } from "../approval/types";
import { mergeVulnerabilityLists } from "../vulnerability/mergeFindings";
import type { VulnerabilityFinding } from "../vulnerability/vulnerabilityFinding";

export const VanguardStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  target: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  iterationCount: Annotation<number>({
    reducer: (x, y) => x + y,
    default: () => 0,
  }),

  isPendingApproval: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),

  // Orchestrator routing cursor
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "supervisor",
  }),

  // Hard authorization key for external tool execution
  isAuthorized: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),

  // Idempotency guard: prevents scout from re-entering after one authorized run
  scoutHasRun: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),

  // Set when operator aborts — routes directly to auditor closure message
  missionAborted: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),

  pendingApprovalContext: Annotation<ApprovalContextV1 | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  pendingApprovalHash: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  pendingApprovalId: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  approvalHistory: Annotation<ApprovalDecision[]>({
    reducer: (_x, y) => y,
    default: () => [],
  }),

  /** Normalized CVE/advisory findings (checkpointed for replay determinism). */
  vulnerabilities: Annotation<VulnerabilityFinding[]>({
    reducer: (left, right) => mergeVulnerabilityLists(left ?? [], right ?? []),
    default: () => [],
  }),

  /** Non-fatal advisory pipeline warnings (budget, source degradation). */
  advisoryEnrichmentWarnings: Annotation<string[]>({
    reducer: (x, y) => x.concat(y ?? []),
    default: () => [],
  }),
});

export type VanguardStateType = typeof VanguardStateAnnotation.State;
