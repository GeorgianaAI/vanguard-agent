import { CheckCircle2, XCircle } from "lucide-react";
import { getToolName } from "ai";
import type { ToolActionHandler, ToolPart } from "../lib/types";
import { getToolQuery, isReconTool, isToolExecuting } from "../lib/utils";
import { ApprovalCard } from "./ApprovalCard";

type ToolInvocationCardProps = {
  part: ToolPart;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
};

export function ToolInvocationCard({
  part,
  onAuthorize,
  onAbort,
}: ToolInvocationCardProps) {
  const toolName = getToolName(part);
  const query = getToolQuery(part);

  const reconTool = isReconTool(toolName);
  const executing = isToolExecuting(part.state);
  const completed = part.state === "output-available";
  const failed = part.state === "output-error";
  const needsApproval = part.state === "approval-requested";

  return (
    <div className="ml-12 rounded border border-slate-800 bg-slate-950/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {reconTool && (
            <span className="rounded bg-cyan-900/50 px-2 py-0.5 text-cyan-300">
              📡 Reconnaissance
            </span>
          )}
          <span className="text-slate-400">{toolName}</span>
        </div>

        {executing && (
          <span className="inline-flex items-center gap-2 text-amber-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            Executing
          </span>
        )}

        {completed && (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </span>
        )}

        {failed && (
          <span className="inline-flex items-center gap-1 text-red-400">
            <XCircle className="h-4 w-4" />
            Failed
          </span>
        )}
      </div>

      {query && (
        <div className="mb-2 text-xs text-cyan-200">
          query: <span className="text-cyan-100">{query}</span>
        </div>
      )}

      {/* System log: raw tool data */}
      {"output" in part && part.output !== undefined && (
        <pre className="overflow-x-auto rounded border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
          {typeof part.output === "string"
            ? part.output
            : JSON.stringify(part.output, null, 2)}
        </pre>
      )}

      {"errorText" in part && part.errorText && (
        <pre className="overflow-x-auto rounded border border-red-950 bg-red-950/20 p-3 text-xs text-red-300">
          {part.errorText}
        </pre>
      )}

      {needsApproval && (
        <ApprovalCard part={part} onAuthorize={onAuthorize} onAbort={onAbort} />
      )}
    </div>
  );
}
