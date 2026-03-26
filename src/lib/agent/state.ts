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
});

export type VanguardStateType = typeof VanguardStateAnnotation.State;
