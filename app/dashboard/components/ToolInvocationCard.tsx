import { Globe, Cpu, CheckCircle2, XCircle } from "lucide-react";
import { getToolName } from "ai";
import type { ToolActionHandler, ToolPart } from "../lib/types";
import { getToolQuery, isReconTool, isToolExecuting } from "../lib/utils";
import { ApprovalCard } from "./ApprovalCard";

type ToolInvocationCardProps = {
  part: ToolPart;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
};

export function ToolInvocationCard({ part, onAuthorize, onAbort }: ToolInvocationCardProps) {
  const toolName = getToolName(part);
  const query = getToolQuery(part);

  const reconTool = isReconTool(toolName);
  const executing = isToolExecuting(part.state);
  const completed = part.state === "output-available";
  const failed = part.state === "output-error";
  const needsApproval = part.state === "approval-requested";

  return (
    <div className="my-6 ml-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg ring-1 ring-inset ring-white/5">
      {/* 📡 HEADER: Aligned with Satellite Status Logic */}
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-950 p-2 border border-slate-800 shadow-inner">
            {reconTool ? (
              <Globe className="h-4 w-4 text-cyan-500" />
            ) : (
              <Cpu className="h-4 w-4 text-slate-500" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500/80">
              {reconTool ? "📡 RECONNAISSANCE" : "⚙️ SYSTEM TOOL"}
            </span>
            <span className="text-[11px] font-bold text-slate-400 tracking-tight">{toolName}</span>
          </div>
        </div>

        {/* 📊 STATUS INDICATORS: Aligned with Dashboard Header LED */}
        <div className="text-[9px] font-black uppercase tracking-widest">
          {executing && (
            <span className="flex items-center gap-2 text-amber-500">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              Executing
            </span>
          )}
          {completed && (
            <span className="flex items-center gap-1.5 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" /> Completed
            </span>
          )}
          {failed && (
            <span className="flex items-center gap-1.5 text-red-500">
              <XCircle className="h-4 w-4" /> Failed
            </span>
          )}
        </div>
      </div>

      {/* 🔍 QUERY PARAMETERS */}
      {query && (
        <div className="flex items-start gap-2 text-[12px] font-medium leading-relaxed text-slate-300">
          <span className="text-cyan-600 font-black uppercase text-[9px] mt-1 tracking-widest">
            Query:
          </span>
          <span className="italic">
            {'"'}
            {query}
            {'"'}
          </span>
        </div>
      )}

      {/* 🗄️ SYSTEM LOG: Raw Intel Vault */}
      {"output" in part && part.output !== undefined && (
        <div className="group relative">
          <div className="absolute top-2 right-4 px-2 py-1 text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
            Raw Intelligence Log
          </div>
          <pre className="custom-scrollbar max-h-64 overflow-auto rounded-xl border border-slate-800 bg-slate-950/80 p-5 text-[11px] leading-relaxed text-slate-400 font-mono shadow-inner border-t-4 border-t-cyan-950/50">
            {typeof part.output === "string" ? part.output : JSON.stringify(part.output, null, 2)}
          </pre>
        </div>
      )}

      {/* ⚠️ ERROR LOG */}
      {"errorText" in part && part.errorText && (
        <pre className="overflow-x-auto rounded-xl border border-red-900/30 bg-red-950/10 p-5 text-[11px] font-bold tracking-tight text-red-400/90">
          SYSTEM ERROR: {part.errorText}
        </pre>
      )}

      {/* ⚖️ GOVERNANCE: Red Button Overlay */}
      {needsApproval && (
        <div className="pt-2 animate-in fade-in zoom-in-95 duration-300">
          <ApprovalCard part={part} onAuthorize={onAuthorize} onAbort={onAbort} />
        </div>
      )}
    </div>
  );
}
