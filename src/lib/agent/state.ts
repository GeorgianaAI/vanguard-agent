import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

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
});

export type VanguardStateType = typeof VanguardStateAnnotation.State;
